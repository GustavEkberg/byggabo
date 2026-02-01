import { redirect } from 'next/navigation';

// Dashboard layout handles landing page for unauthenticated users
// Authenticated users are redirected to the projects list
export default function Page() {
  redirect('/projects');
}
