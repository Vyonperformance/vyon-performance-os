-- Technical catalog only: no organization, customers or passwords.
insert into public.permissions(code,description) values
('clients.read','clients.read'),
('clients.read_all','clients.read_all'),
('clients.manage','clients.manage'),
('services.read','services.read'),
('services.manage','services.manage'),
('team.read','team.read'),
('team.manage','team.manage'),
('finance.read','finance.read'),
('finance.manage','finance.manage'),
('contracts.read','contracts.read'),
('contracts.manage','contracts.manage'),
('access.read','access.read'),
('access.validate','access.validate'),
('tasks.read','tasks.read'),
('tasks.manage','tasks.manage'),
('reports.read','reports.read'),
('reports.manage','reports.manage'),
('traffic.read','traffic.read'),
('integrations.manage','integrations.manage'),
('audit.read','audit.read')
on conflict(code) do update set description=excluded.description;
