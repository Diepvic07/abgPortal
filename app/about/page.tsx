import { redirect } from 'next/navigation';

// About page redirects to homepage until dedicated content is created
export default function AboutPage() {
  redirect('/');
}
