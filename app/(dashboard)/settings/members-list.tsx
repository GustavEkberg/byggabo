type Member = {
  id: string;
  name: string;
  email: string;
};

type MembersListProps = {
  members: Member[];
};

export function MembersList({ members }: MembersListProps) {
  return (
    <div className="space-y-2">
      {members.map(member => (
        <div key={member.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{member.name}</p>
            <p className="text-sm text-muted-foreground truncate">{member.email}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
