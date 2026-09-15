-- Initial collegiate Rocket League beta schools. Add schools through the admin dashboard as teams request access.
insert into public.schools (name, email_domain, verified) values
  ('Bowling Green State University', 'bgsu.edu', true),
  ('The Ohio State University', 'osu.edu', true),
  ('Kent State University', 'kent.edu', true),
  ('Michigan Technological University', 'mtu.edu', true),
  ('University of Akron', 'uakron.edu', true)
on conflict (name) do nothing;
