const fs = require('fs');
let content = fs.readFileSync('views/partials/sidebar.ejs', 'utf-8');

const mapping = {
  'self-review': 'create_self_review',
  'log': 'view_own_logs',
  'achievements': 'view_own_logs',
  'projects': 'view_projects',
  'team-log': 'view_team_logs',
  'team-members': 'view_team_logs',
  'team-report': 'view_team_logs',
  'goals': 'manage_goals',
  'highlights': 'manage_goals',
  'history': 'manage_goals',
  'reports': 'generate_reports',
  'users': 'manage_users',
  'teams': 'manage_teams',
  'roles': 'manage_roles',
};

// We will find all <li class="nav-item <%= currentPage === '...' ? 'active' : '' %>">
// and wrap them in <% if (privileges && privileges.includes('...')) { %> ... <% } %>

for (const [page, priv] of Object.entries(mapping)) {
  const regex = new RegExp(`(<li class="nav-item <%= (?:typeof )?currentPage (?:!== 'undefined' && currentPage )?=== '${page}' \\? 'active' : '' %>">[\\s\\S]*?<\\/li>)`, 'g');
  content = content.replace(regex, `<% if (typeof privileges !== 'undefined' && privileges.includes('${priv}')) { %>\n        $1\n        <% } %>`);
}

fs.writeFileSync('views/partials/sidebar.ejs', content);
console.log('Done');
