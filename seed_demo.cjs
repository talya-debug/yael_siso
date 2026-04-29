const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://ztbckbcwefnjpwgrdwkl.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0YmNrYmN3ZWZuanB3Z3Jkd2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzA3OTQsImV4cCI6MjA4OTE0Njc5NH0.SOjhaVVzxrFYlwVWnopo8BBUPYpZDgGCRLJ0uN9QIss');

async function seed() {
  // === CLIENTS ===
  const clients = [
    { name: 'David & Maya Cohen', phone: '054-7788990', email: 'cohen.dm@gmail.com', address: 'Herzliya Pituach, Hamasger 12', notes: 'Penthouse renovation, 180sqm' },
    { name: 'Dr. Amit Levi', phone: '052-3344556', email: 'amit.levi@gmail.com', address: 'Tel Aviv, Rothschild 45', notes: 'New apartment, modern style' },
    { name: 'Noa & Oren Shapira', phone: '050-1122334', email: 'shapira.family@gmail.com', address: 'Raanana, Habankim 8', notes: 'Family home, 5 rooms, garden' },
    { name: 'Galit Bar', phone: '053-9988776', email: 'galit.bar@outlook.com', address: 'Jaffa, Yefet 102', notes: 'Loft conversion, industrial style' },
    { name: 'Eitan & Shira Arison', phone: '054-5566778', email: 'arison.es@gmail.com', address: 'Savyon, Haela 3', notes: 'Villa, 350sqm, luxury' },
    { name: 'Yonatan Miller', phone: '050-2233445', email: 'y.miller@gmail.com', address: 'Caesarea, Hagefen 15', notes: 'Beach house renovation' },
  ];
  const { data: ic } = await s.from('clients').insert(clients).select();
  console.log('Clients:', ic.length);

  // Get contents
  const { data: contents } = await s.from('contents').select('id, level, name, parent_id, sort_order').order('sort_order');
  const phases = contents.filter(c => c.level === 'phase');
  const allTasks = contents.filter(c => c.level === 'task');
  const allSubs = contents.filter(c => c.level === 'subtask');

  function getScopeIds(n) {
    const ids = [];
    phases.slice(0, n).forEach(ph => {
      ids.push(ph.id);
      allTasks.filter(t => t.parent_id === ph.id).forEach(t => {
        ids.push(t.id);
        allSubs.filter(st => st.parent_id === t.id).forEach(st => ids.push(st.id));
      });
    });
    return ids;
  }

  // === PROPOSALS ===
  const propCfg = [
    { ci: 0, status: 'approved', ph: 6 },
    { ci: 1, status: 'approved', ph: 4 },
    { ci: 2, status: 'approved', ph: 5 },
    { ci: 3, status: 'draft', ph: 3 },
    { ci: 4, status: 'sent', ph: 7 },
    { ci: 5, status: 'draft', ph: 2 },
  ];
  for (const cfg of propCfg) {
    const { data: prop } = await s.from('proposals').insert({ client_id: ic[cfg.ci].id, status: cfg.status }).select().single();
    const ids = getScopeIds(cfg.ph);
    for (let i = 0; i < ids.length; i += 50) {
      await s.from('proposal_items').insert(ids.slice(i, i + 50).map(cid => ({ proposal_id: prop.id, content_id: cid })));
    }
    console.log(ic[cfg.ci].name, '-', cfg.status, '-', ids.length, 'items');
  }

  // === PROJECTS ===
  const projCfg = [
    { ci: 0, name: 'Cohen Penthouse Herzliya', start: '2026-01-15' },
    { ci: 1, name: 'Levi Apartment Rothschild', start: '2026-02-01' },
    { ci: 2, name: 'Shapira Family Home Raanana', start: '2026-03-10' },
  ];
  const projs = [];
  for (const cfg of projCfg) {
    const { data: proj } = await s.from('projects').insert({
      client_id: ic[cfg.ci].id, name: cfg.name, status: 'active', start_date: cfg.start
    }).select().single();
    projs.push(proj);
    console.log('Project:', proj.name);
  }

  // === TASKS ===
  const statuses = ['done','done','done','in_progress','in_progress','pending','pending','pending','pending','pending'];
  for (let pi = 0; pi < projs.length; pi++) {
    const proj = projs[pi];
    const numPh = [4, 3, 2][pi];
    let cnt = 0, si = 0;
    for (const phase of phases.slice(0, numPh)) {
      const ptasks = allTasks.filter(t => t.parent_id === phase.id).slice(0, 6);
      for (const task of ptasks) {
        const st = statuses[si % statuses.length];
        const sd = new Date(proj.start_date); sd.setDate(sd.getDate() + cnt * 5);
        const dd = new Date(sd); dd.setDate(dd.getDate() + (task.estimated_days || 7));
        await s.from('tasks').insert({
          project_id: proj.id, name: task.name, status: st, level: 'task',
          phase_name: phase.name, content_ref_id: task.id, sort_order: task.sort_order,
          estimated_days: task.estimated_days || 7,
          start_date: sd.toISOString().split('T')[0],
          due_date: dd.toISOString().split('T')[0],
        });
        cnt++; si++;
      }
    }
    console.log('Tasks for', proj.name, ':', cnt);
  }

  // === SUPPLIERS ===
  const sups = [
    { name: 'Marble & Stone Ltd', category: 'Stone & Tile', phone: '03-5551234', email: 'info@marblestone.co.il', commission_pct: 10 },
    { name: 'LightHouse Fixtures', category: 'Lighting', phone: '03-5552345', email: 'sales@lighthouse.co.il', commission_pct: 12 },
    { name: 'Elite Kitchens', category: 'Carpentry', phone: '09-7771234', email: 'orders@elitekitchens.co.il', commission_pct: 8 },
    { name: 'Dor Ceramics', category: 'Stone & Tile', phone: '04-8881234', email: 'dor@ceramics.co.il', commission_pct: 10 },
    { name: 'Smart Home Pro', category: 'Electricians', phone: '052-8887766', email: 'info@smarthomepro.co.il', commission_pct: 15 },
    { name: 'Hadari Aluminum', category: 'Contractors', phone: '08-6661234', email: 'hadari@aluminum.co.il', commission_pct: 7 },
  ];
  const { data: isups } = await s.from('suppliers').insert(sups).select();
  console.log('Suppliers:', isups.length);

  // === SUPPLIER PAYMENTS ===
  const spay = [
    { supplier_id: isups[0].id, project_id: projs[0].id, description: 'Living room marble flooring', amount: 45000, commission_pct: 10, status: 'paid', payment_date: '2026-02-15' },
    { supplier_id: isups[1].id, project_id: projs[0].id, description: 'Dining room chandelier + bedroom fixtures', amount: 28000, commission_pct: 12, status: 'pending' },
    { supplier_id: isups[2].id, project_id: projs[0].id, description: 'Custom kitchen cabinets', amount: 85000, commission_pct: 8, status: 'pending' },
    { supplier_id: isups[3].id, project_id: projs[1].id, description: 'Bathroom tiles - 3 bathrooms', amount: 32000, commission_pct: 10, status: 'paid', payment_date: '2026-03-10' },
    { supplier_id: isups[4].id, project_id: projs[1].id, description: 'Smart home system installation', amount: 55000, commission_pct: 15, status: 'pending' },
    { supplier_id: isups[5].id, project_id: projs[2].id, description: 'Windows and sliding doors', amount: 72000, commission_pct: 7, status: 'pending' },
  ];
  await s.from('supplier_payments').insert(spay);
  console.log('Supplier payments: 6');

  // === CLIENT BILLING ===
  const billing = [
    { project_id: projs[0].id, name: 'Advance Payment', amount: 45000, pct: 30, status: 'paid', due_date: '2026-01-20' },
    { project_id: projs[0].id, name: 'Layout Approval', amount: 30000, pct: 20, status: 'paid', due_date: '2026-02-28' },
    { project_id: projs[0].id, name: 'Working Drawings', amount: 45000, pct: 30, status: 'pending', due_date: '2026-04-15' },
    { project_id: projs[0].id, name: 'Project Completion', amount: 30000, pct: 20, status: 'pending', due_date: '2026-07-01' },
    { project_id: projs[1].id, name: 'Advance Payment', amount: 27000, pct: 30, status: 'paid', due_date: '2026-02-05' },
    { project_id: projs[1].id, name: 'Layout Approval', amount: 18000, pct: 20, status: 'sent', due_date: '2026-03-20' },
    { project_id: projs[1].id, name: 'Working Drawings', amount: 27000, pct: 30, status: 'pending', due_date: '2026-05-01' },
    { project_id: projs[1].id, name: 'Project Completion', amount: 18000, pct: 20, status: 'pending', due_date: '2026-08-01' },
    { project_id: projs[2].id, name: 'Advance Payment', amount: 36000, pct: 30, status: 'paid', due_date: '2026-03-15' },
    { project_id: projs[2].id, name: 'Layout Approval', amount: 24000, pct: 20, status: 'pending', due_date: '2026-05-01' },
    { project_id: projs[2].id, name: 'Working Drawings', amount: 36000, pct: 30, status: 'pending', due_date: '2026-06-15' },
    { project_id: projs[2].id, name: 'Project Completion', amount: 24000, pct: 20, status: 'pending', due_date: '2026-09-01' },
  ];
  await s.from('payments').insert(billing);
  console.log('Billing milestones: 12');

  // === WORK LOG ===
  const workers = ['Yael Siso', 'Chloe Ben-David', 'Tal Kaplan', 'Dana Roth'];
  const roles = ['Project Manager', 'Designer', 'CAD Drafter', 'Project Manager'];
  const descs = [
    'Client meeting - needs clarification and inspiration review',
    'Layout alternatives - sketching 3 options',
    'AutoCAD - demolition and construction plans',
    'Supplier coordination - marble samples selection',
    'Presentation preparation for client meeting',
    'Site visit - measurements verification',
    'Material board preparation',
    'Electrical plan drafting with smart home integration',
    'Kitchen supplier meeting - reviewing quotes',
    'Internal review - finalizing presentation',
    'Client meeting - layout approval discussion',
    'Lighting plan - coordinating with consultant',
    'Budget spreadsheet update',
    'Bathroom tile layout - 3D visualization',
    'Carpentry drawings - walk-in closet detail',
  ];
  const logs = [];
  for (let day = 0; day < 30; day++) {
    const d = new Date('2026-04-25');
    d.setDate(d.getDate() - day);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const n = 1 + Math.floor(Math.random() * 3);
    for (let e = 0; e < n; e++) {
      const wi = Math.floor(Math.random() * 4);
      const pi = Math.floor(Math.random() * 3);
      logs.push({
        project_id: projs[pi].id,
        date: d.toISOString().split('T')[0],
        role: roles[wi],
        worker_name: workers[wi],
        hours: [2, 3, 4, 5, 6, 7, 8][Math.floor(Math.random() * 7)],
        description: descs[Math.floor(Math.random() * descs.length)],
      });
    }
  }
  await s.from('work_log').insert(logs);
  console.log('Work log entries:', logs.length);

  // === KNOWLEDGE ===
  const articles = [
    { title: 'Material Selection Checklist', category: 'Templates', content: 'Standard checklist for material selection meetings:\n1. Print floor plans\n2. Prepare quantity tables\n3. Send references to store\n4. Bring material samples\n5. Document all selections with photos' },
    { title: 'Client Onboarding Process', category: 'Procedures', content: 'Steps for onboarding a new client:\n1. Initial meeting\n2. Send proposal\n3. Get signature\n4. Collect advance payment\n5. Fill client details form\n6. Assign PM and drafter\n7. Schedule needs clarification meeting' },
    { title: 'Preferred Paint Colors 2026', category: 'Resources', content: 'Approved palette:\n- Benjamin Moore: White Dove, Revere Pewter, Hale Navy\n- Tambour: Desert Sand, Olive Branch\n- Jotun: Lady Pure White, Soft Touch' },
    { title: 'Photography Guidelines', category: 'Templates', content: 'End of project photography:\n- Schedule golden hour\n- Stage all rooms with accessories\n- Remove personal items\n- Clean all surfaces\n- 3 angles per room minimum' },
  ];
  await s.from('knowledge').insert(articles);
  console.log('Knowledge articles: 4');

  console.log('\n=== DONE ===');
}

seed().catch(e => console.error(e));
