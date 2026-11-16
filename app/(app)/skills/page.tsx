import { redirect } from 'next/navigation';

// Skills now live on the Team page: open a person to see and edit their
// skill levels. This keeps old bookmarks working.
export default function SkillsRedirect() {
  redirect('/team');
}
