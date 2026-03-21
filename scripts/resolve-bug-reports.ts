import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Bug IDs to mark as resolved with reason
const bugsToResolve: { id: string; reason: string }[] = [
  // Already fixed: Footer only has Facebook with correct URL, X/LinkedIn removed
  { id: 'a4bb144f-2b06-45bd-9839-2ab6d9f754b7', reason: 'Fixed: Facebook URL correct, X/LinkedIn removed' },
  // Already fixed: Auto-filter on class change via useEffect
  { id: '01a89cb9-1281-4c3c-acf4-2242a4a6b805', reason: 'Fixed: Auto-search triggers on class filter change' },
  // Already fixed: Total members shown + same-class display
  { id: '8b43e596-d1ce-43b7-9c47-3df904c0cf48', reason: 'Fixed: Total member count displayed, same-class auto-loaded' },
  // Fixed now: loveDesc text updated
  { id: 'b4d5a451-dc24-4383-9b4d-6f503253c387', reason: 'Fixed: Updated loveDesc to include friends with shared interests' },
  // Fixed now: filterAllClasses "lớp" → "khoá ABG"
  { id: '1d4f022a-42bc-439b-a6df-fc2715c2f52e', reason: 'Fixed: Changed "lớp" to "khoá ABG"' },
  // Fixed now: 300 → 600 member count
  { id: '65487ff9-f7c5-46eb-905f-ee692ddfbc39', reason: 'Fixed: Updated 300 to 600+ members' },
  // Fixed now: Footer Facebook links with ABG Alumni + ABG Program
  { id: '339e70f2-91af-4e52-b8e3-143a3abae39b', reason: 'Fixed: Added ABG Alumni and ABG Program Facebook links' },
  // Fixed now: Payment reference format updated
  { id: '565f722e-8db9-4b51-bfe2-672c9b5988a8', reason: 'Fixed: Payment reference format updated to ABG Alumni - Name - Khoa - Email' },
  // Fixed now: /about page redirects to homepage
  { id: '879e1977-fb34-4d25-a34f-7d57b6ffe0a7', reason: 'Fixed: /about redirects to homepage' },
  { id: '41ad0f9b-fcbf-489c-9f2e-e10b649dd521', reason: 'Fixed: /about redirects to homepage' },
];

async function main() {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  for (const bug of bugsToResolve) {
    const { error } = await supabase
      .from('bug_reports')
      .update({ status: 'fixed' })
      .eq('id', bug.id);

    if (error) {
      console.error(`Failed to resolve ${bug.id}: ${error.message}`);
    } else {
      console.log(`Resolved: ${bug.reason}`);
    }
  }

  // Show remaining open bugs
  const { data } = await supabase
    .from('bug_reports')
    .select('id, description, page_url, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  console.log(`\n${data?.length || 0} bugs still open:`);
  data?.forEach((b, i) => {
    console.log(`${i + 1}. [${b.page_url}] ${b.description.substring(0, 80)}`);
  });
}

main();
