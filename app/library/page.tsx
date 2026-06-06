import { redirect } from 'next/navigation';

export default function LibraryIndexPage() {
  redirect('/events?tab=library');
}
