-- Reclassify existing project_* proposals to category='project' so the
-- "Talk" (or whatever the original proposal category was) badge is
-- replaced by the new "🚀 Dự án" badge in listings and on the proposal
-- page. New projects are reclassified automatically by the project
-- formation endpoint.

update community_proposals
   set category = 'project',
       updated_at = to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
 where status in (
   'project_active',
   'project_completed',
   'project_discontinued',
   'project_closed'
 )
   and category <> 'project';
