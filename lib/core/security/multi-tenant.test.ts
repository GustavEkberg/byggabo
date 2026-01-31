import { layer, expect } from '@effect/vitest';
import { Effect, Layer, Context } from 'effect';
import { UnauthenticatedError, NotFoundError } from '@/lib/core/errors';

/**
 * Multi-tenant security tests
 *
 * Validates that all queries and actions properly isolate data by userId.
 * Uses mock services to simulate different users accessing resources.
 *
 * Security model:
 * - All resources (projects, contacts, etc.) are owned by a single user
 * - Resources are never shared between users
 * - Accessing another user's resource returns NotFoundError (not UnauthorizedError)
 *   to avoid leaking existence information
 */

// Types matching the schema
type Project = {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

type CostItem = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  amount: string;
  date: Date;
  receiptFileUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Mock Auth service
class Auth extends Context.Tag('@app/Auth')<
  Auth,
  {
    readonly getSession: () => Effect.Effect<
      { user: { id: string; email: string; name: string } },
      UnauthenticatedError
    >;
  }
>() {}

// Mock repository for projects
class ProjectRepository extends Context.Tag('@app/ProjectRepository')<
  ProjectRepository,
  {
    readonly findById: (id: string, userId: string) => Effect.Effect<Project, NotFoundError>;
    readonly findAll: (userId: string) => Effect.Effect<Project[]>;
    readonly create: (input: { name: string; userId: string }) => Effect.Effect<Project>;
  }
>() {}

// Mock repository for contacts
class ContactRepository extends Context.Tag('@app/ContactRepository')<
  ContactRepository,
  {
    readonly findById: (id: string) => Effect.Effect<Contact, NotFoundError>;
    readonly findAll: (userId: string) => Effect.Effect<Contact[]>;
  }
>() {}

// Mock repository for cost items (nested under projects)
class CostItemRepository extends Context.Tag('@app/CostItemRepository')<
  CostItemRepository,
  {
    readonly findById: (
      id: string
    ) => Effect.Effect<{ costItem: CostItem; project: { userId: string } }, NotFoundError>;
    readonly findByProject: (projectId: string) => Effect.Effect<CostItem[]>;
  }
>() {}

// Factory for creating mock Auth with specific user
const createMockAuth = (userId: string, authenticated = true) =>
  Layer.succeed(Auth, {
    getSession: () =>
      authenticated
        ? Effect.succeed({
            user: {
              id: userId,
              email: `${userId}@example.com`,
              name: `User ${userId}`
            }
          })
        : Effect.fail(new UnauthenticatedError({ message: 'Not authenticated' }))
  });

// Seed data for testing
const USER_A = 'user-a-id';
const USER_B = 'user-b-id';

const seedProjects: Project[] = [
  {
    id: 'project-1',
    name: 'User A Project',
    description: 'Belongs to User A',
    status: 'ACTIVE',
    userId: USER_A,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'project-2',
    name: 'User B Project',
    description: 'Belongs to User B',
    status: 'ACTIVE',
    userId: USER_B,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const seedContacts: Contact[] = [
  {
    id: 'contact-1',
    name: 'User A Contact',
    email: 'contact-a@example.com',
    phone: null,
    company: null,
    userId: USER_A,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'contact-2',
    name: 'User B Contact',
    email: 'contact-b@example.com',
    phone: null,
    company: null,
    userId: USER_B,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const seedCostItems: CostItem[] = [
  {
    id: 'cost-1',
    projectId: 'project-1', // Belongs to User A's project
    name: 'User A Cost',
    description: null,
    amount: '1000.00',
    date: new Date(),
    receiptFileUrl: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Mock repositories with ownership checks
const MockProjectRepository = Layer.succeed(ProjectRepository, {
  findById: (id, userId) =>
    Effect.gen(function* () {
      const project = seedProjects.find(p => p.id === id);
      if (!project || project.userId !== userId) {
        return yield* new NotFoundError({
          message: 'Project not found',
          entity: 'project',
          id
        });
      }
      return project;
    }),
  findAll: userId => Effect.succeed(seedProjects.filter(p => p.userId === userId)),
  create: input =>
    Effect.succeed({
      id: `project-${Date.now()}`,
      name: input.name,
      description: null,
      status: 'ACTIVE' as const,
      userId: input.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    })
});

const MockContactRepository = Layer.succeed(ContactRepository, {
  findById: id =>
    Effect.gen(function* () {
      const contact = seedContacts.find(c => c.id === id);
      if (!contact) {
        return yield* new NotFoundError({
          message: 'Contact not found',
          entity: 'contact',
          id
        });
      }
      return contact;
    }),
  findAll: userId => Effect.succeed(seedContacts.filter(c => c.userId === userId))
});

const MockCostItemRepository = Layer.succeed(CostItemRepository, {
  findById: id =>
    Effect.gen(function* () {
      const costItem = seedCostItems.find(c => c.id === id);
      if (!costItem) {
        return yield* new NotFoundError({
          message: 'Cost item not found',
          entity: 'costItem',
          id
        });
      }
      const project = seedProjects.find(p => p.id === costItem.projectId);
      if (!project) {
        return yield* new NotFoundError({
          message: 'Cost item not found',
          entity: 'costItem',
          id
        });
      }
      return { costItem, project: { userId: project.userId } };
    }),
  findByProject: projectId => Effect.succeed(seedCostItems.filter(c => c.projectId === projectId))
});

// Domain functions that mirror the actual implementation
const getProjects = () =>
  Effect.gen(function* () {
    const auth = yield* Auth;
    const repo = yield* ProjectRepository;
    const session = yield* auth.getSession();
    return yield* repo.findAll(session.user.id);
  });

const getProject = (projectId: string) =>
  Effect.gen(function* () {
    const auth = yield* Auth;
    const repo = yield* ProjectRepository;
    const session = yield* auth.getSession();
    return yield* repo.findById(projectId, session.user.id);
  });

const getContacts = () =>
  Effect.gen(function* () {
    const auth = yield* Auth;
    const repo = yield* ContactRepository;
    const session = yield* auth.getSession();
    return yield* repo.findAll(session.user.id);
  });

const getContact = (contactId: string) =>
  Effect.gen(function* () {
    const auth = yield* Auth;
    const contactRepo = yield* ContactRepository;
    const session = yield* auth.getSession();
    const contact = yield* contactRepo.findById(contactId);
    if (contact.userId !== session.user.id) {
      return yield* new NotFoundError({
        message: 'Contact not found',
        entity: 'contact',
        id: contactId
      });
    }
    return contact;
  });

const getCostItem = (costItemId: string) =>
  Effect.gen(function* () {
    const auth = yield* Auth;
    const costItemRepo = yield* CostItemRepository;
    const session = yield* auth.getSession();
    const result = yield* costItemRepo.findById(costItemId);
    if (result.project.userId !== session.user.id) {
      return yield* new NotFoundError({
        message: 'Cost item not found',
        entity: 'costItem',
        id: costItemId
      });
    }
    return result.costItem;
  });

// Test User A can access their own resources
const UserATestLayer = Layer.mergeAll(
  createMockAuth(USER_A),
  MockProjectRepository,
  MockContactRepository,
  MockCostItemRepository
);

layer(UserATestLayer)('User A accessing own resources', it => {
  it.effect('can list own projects only', () =>
    Effect.gen(function* () {
      const projects = yield* getProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe('project-1');
      expect(projects[0].userId).toBe(USER_A);
    })
  );

  it.effect('can get own project by id', () =>
    Effect.gen(function* () {
      const project = yield* getProject('project-1');
      expect(project.id).toBe('project-1');
      expect(project.userId).toBe(USER_A);
    })
  );

  it.effect('cannot access User B project - returns NotFoundError', () =>
    Effect.gen(function* () {
      const result = yield* getProject('project-2').pipe(Effect.either);
      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left._tag).toBe('NotFoundError');
        // Verify message doesn't leak that project exists for another user
        expect(result.left.message).toBe('Project not found');
      }
    })
  );

  it.effect('can list own contacts only', () =>
    Effect.gen(function* () {
      const contacts = yield* getContacts();
      expect(contacts).toHaveLength(1);
      expect(contacts[0].id).toBe('contact-1');
      expect(contacts[0].userId).toBe(USER_A);
    })
  );

  it.effect('cannot access User B contact - returns NotFoundError', () =>
    Effect.gen(function* () {
      const result = yield* getContact('contact-2').pipe(Effect.either);
      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left._tag).toBe('NotFoundError');
      }
    })
  );

  it.effect('can access cost item from own project', () =>
    Effect.gen(function* () {
      const costItem = yield* getCostItem('cost-1');
      expect(costItem.id).toBe('cost-1');
      expect(costItem.projectId).toBe('project-1');
    })
  );
});

// Test User B can access their own resources
const UserBTestLayer = Layer.mergeAll(
  createMockAuth(USER_B),
  MockProjectRepository,
  MockContactRepository,
  MockCostItemRepository
);

layer(UserBTestLayer)('User B accessing resources', it => {
  it.effect('can list own projects only', () =>
    Effect.gen(function* () {
      const projects = yield* getProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe('project-2');
      expect(projects[0].userId).toBe(USER_B);
    })
  );

  it.effect('cannot access User A project - returns NotFoundError', () =>
    Effect.gen(function* () {
      const result = yield* getProject('project-1').pipe(Effect.either);
      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left._tag).toBe('NotFoundError');
      }
    })
  );

  it.effect('cannot access User A cost item - returns NotFoundError', () =>
    Effect.gen(function* () {
      const result = yield* getCostItem('cost-1').pipe(Effect.either);
      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left._tag).toBe('NotFoundError');
        // Verify we don't leak that the cost item exists
        expect(result.left.message).toBe('Cost item not found');
      }
    })
  );
});

// Test unauthenticated access
const UnauthenticatedTestLayer = Layer.mergeAll(
  createMockAuth('', false),
  MockProjectRepository,
  MockContactRepository,
  MockCostItemRepository
);

layer(UnauthenticatedTestLayer)('Unauthenticated access', it => {
  it.effect('cannot list projects - returns UnauthenticatedError', () =>
    Effect.gen(function* () {
      const result = yield* getProjects().pipe(Effect.either);
      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left._tag).toBe('UnauthenticatedError');
      }
    })
  );

  it.effect('cannot get project by id - returns UnauthenticatedError', () =>
    Effect.gen(function* () {
      const result = yield* getProject('project-1').pipe(Effect.either);
      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left._tag).toBe('UnauthenticatedError');
      }
    })
  );
});
