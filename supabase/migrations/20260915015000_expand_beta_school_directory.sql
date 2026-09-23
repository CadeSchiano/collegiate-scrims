-- Beta directory expansion: MAC, Big Ten, SEC, and current Mountain West schools.
-- School entries only make a school selectable; every team still requires manual approval.
insert into public.schools (name, email_domain, verified)
values
  -- Mid-American Conference
  ('Ball State University', 'bsu.edu', true),
  ('University at Buffalo', 'buffalo.edu', true),
  ('Central Michigan University', 'cmich.edu', true),
  ('Eastern Michigan University', 'emich.edu', true),
  ('Miami University', 'miamioh.edu', true),
  ('Northern Illinois University', 'niu.edu', true),
  ('Ohio University', 'ohio.edu', true),
  ('University of Massachusetts Amherst', 'umass.edu', true),
  ('University of Toledo', 'utoledo.edu', true),
  ('Western Michigan University', 'wmich.edu', true),

  -- Big Ten Conference
  ('University of Illinois Urbana-Champaign', 'illinois.edu', true),
  ('Indiana University Bloomington', 'iu.edu', true),
  ('University of Iowa', 'uiowa.edu', true),
  ('University of Maryland, College Park', 'umd.edu', true),
  ('University of Michigan', 'umich.edu', true),
  ('Michigan State University', 'msu.edu', true),
  ('University of Minnesota Twin Cities', 'umn.edu', true),
  ('University of Nebraska-Lincoln', 'unl.edu', true),
  ('Northwestern University', 'northwestern.edu', true),
  ('Pennsylvania State University', 'psu.edu', true),
  ('Purdue University', 'purdue.edu', true),
  ('Rutgers University', 'rutgers.edu', true),
  ('University of Wisconsin-Madison', 'wisc.edu', true),
  ('University of Oregon', 'uoregon.edu', true),
  ('University of California, Los Angeles', 'ucla.edu', true),
  ('University of Southern California', 'usc.edu', true),
  ('University of Washington', 'washington.edu', true),

  -- Southeastern Conference
  ('University of Alabama', 'ua.edu', true),
  ('University of Arkansas', 'uark.edu', true),
  ('Auburn University', 'auburn.edu', true),
  ('University of Florida', 'ufl.edu', true),
  ('University of Georgia', 'uga.edu', true),
  ('University of Kentucky', 'uky.edu', true),
  ('Louisiana State University', 'lsu.edu', true),
  ('University of Mississippi', 'olemiss.edu', true),
  ('Mississippi State University', 'msstate.edu', true),
  ('University of Missouri', 'missouri.edu', true),
  ('University of Oklahoma', 'ou.edu', true),
  ('University of South Carolina', 'sc.edu', true),
  ('University of Tennessee, Knoxville', 'utk.edu', true),
  ('University of Texas at Austin', 'utexas.edu', true),
  ('Texas A&M University', 'tamu.edu', true),
  ('Vanderbilt University', 'vanderbilt.edu', true),

  -- Mountain West Conference
  ('United States Air Force Academy', 'usafa.edu', true),
  ('Colorado College', 'coloradocollege.edu', true),
  ('Grand Canyon University', 'gcu.edu', true),
  ('University of Hawaiʻi at Mānoa', 'hawaii.edu', true),
  ('University of Nevada, Reno', 'unr.edu', true),
  ('University of Nevada, Las Vegas', 'unlv.edu', true),
  ('University of New Mexico', 'unm.edu', true),
  ('North Dakota State University', 'ndsu.edu', true),
  ('San José State University', 'sjsu.edu', true),
  ('University of California, Davis', 'ucdavis.edu', true),
  ('Utah Tech University', 'utahtech.edu', true),
  ('University of Texas at El Paso', 'utep.edu', true),
  ('University of Wyoming', 'uwyo.edu', true)
on conflict (name) do nothing;
