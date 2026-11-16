import { redirect } from 'next/navigation';

// Smart Allocate now lives inside Projects: open a task and press
// "Smart allocate". This keeps old bookmarks working.
export default function SmartAllocateRedirect() {
  redirect('/projects');
}
