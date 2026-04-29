const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://ztbckbcwefnjpwgrdwkl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0YmNrYmN3ZWZuanB3Z3Jkd2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzA3OTQsImV4cCI6MjA4OTE0Njc5NH0.SOjhaVVzxrFYlwVWnopo8BBUPYpZDgGCRLJ0uN9QIss'
);

const PLAN_SUBTASKS = [
  'Meeting with drafter to hand over project info',
  'Submit plan for project manager approval',
  'File in client folder',
];

const MATERIAL_SUBTASKS = [
  'Coordinate with client',
  'Coordinate with store',
  'Send references to store in advance for client introduction',
  'Print plans for the meeting',
  'Prepare quantities for the meeting',
  'Meeting summary after store visit with photos',
  'Send email to store with all details and selections for accurate quote x3',
  'Review quotes and verify no errors',
  'File in client folder and budget spreadsheet',
  'Send consolidated email to client with 3 supplier alternatives',
  'Client selects supplier and bill of quantities',
  'File bill of quantities',
  'Send email to selected supplier with revised BOQ and selected materials',
  'Request revised quote',
  'Client signature and first payment request',
  'Filing',
];

const SCOPE_TEMPLATE = [
  {
    name: 'Project Initiation', sort_order: 1,
    tasks: [
      { name: 'Initial meeting with potential client', estimated_days: null, sort_order: 1, subtasks: [] },
      { name: 'Send interior design proposal', estimated_days: 1, sort_order: 2, subtasks: [] },
      { name: 'Client signs interior design proposal', estimated_days: 3, sort_order: 3, subtasks: [] },
      { name: 'Request advance payment', estimated_days: 1, sort_order: 4, subtasks: [] },
      { name: 'Fill client details form (via Chloe with client)', estimated_days: 1, sort_order: 5, subtasks: [] },
      { name: 'Select project manager, drafter and 3D artist', estimated_days: 2, sort_order: 6, subtasks: [] },
      { name: 'Send project manager / supervisor proposal to client', estimated_days: 2, sort_order: 7, subtasks: [] },
      { name: 'Quantity surveyor and electrical consultant proposal', estimated_days: 3, sort_order: 8, subtasks: [] },
      { name: 'Optional - HVAC, lighting, landscaping consultants', estimated_days: 3, sort_order: 9, subtasks: [] },
      { name: 'Send surveyor proposal (virtual tour + electrical marking + 6-month subscription)', estimated_days: 3, sort_order: 10, subtasks: [] },
      { name: 'Send photorealistic 3D rendering proposal to client', estimated_days: 3, sort_order: 11, subtasks: [] },
    ],
  },
  {
    name: 'Initial Planning', sort_order: 2,
    tasks: [
      { name: 'Perform measurement', estimated_days: 3, sort_order: 1, subtasks: [] },
      { name: 'Needs clarification meeting', estimated_days: 7, sort_order: 2,
        subtasks: ['Schedule 2-hour meeting with clients', 'Request Pinterest inspiration collection - send coordination message including meeting prep', 'Send needs clarification document in advance', 'Send meeting summary by email for client approval'] },
      { name: 'Present layout alternatives & look and feel', estimated_days: 21, sort_order: 3,
        subtasks: ['Schedule meeting with client to present alternatives', 'Schedule team brainstorming meeting for look & feel and layout options', 'Schedule meeting to present layout alternatives', 'Layout alternative corrections', 'Graphics for alternatives', 'Refine look & feel per alternatives', 'Prepare presentation for meeting', 'Internal meeting to finalize presentation (4 days before)', 'Presentation corrections before meeting', 'Corrections after client meeting', 'Send corrected presentation to client (within 1 week)', 'File final presentation in folder', 'Schedule 2 focused days with client for stores + electrical/plumbing checklist review'] },
      { name: 'Final layout approval by clients', estimated_days: 5, sort_order: 4,
        subtasks: ['Email final layout plan with look & feel presentation and request email approval'] },
    ],
  },
  {
    name: 'Working Plans - Initial', sort_order: 3,
    tasks: [
      { name: 'Volumetric SketchUp', estimated_days: 7, sort_order: 1, subtasks: [] },
      { name: 'Demolition plan', estimated_days: 7, sort_order: 2, subtasks: PLAN_SUBTASKS },
      { name: 'Construction plan', estimated_days: 10, sort_order: 3,
        subtasks: ['Meeting with drafter to hand over project info', 'Submit plan for PM approval - verify door specs, wall reinforcements, block vs drywall, wall thickness', 'File in client folder'] },
      { name: 'Plumbing plan', estimated_days: 7, sort_order: 4,
        subtasks: ['Meeting with drafter to hand over project info', 'Submit plan for PM approval including fixture specifications', 'File in client folder'] },
      { name: 'Electrical plan', estimated_days: 10, sort_order: 5,
        subtasks: ['Review client electrical checklist', 'Review appliance specifications', 'If smart home - get plan from supplier', 'Get instructions from audio/video supplier', 'Get instructions from alarm provider if applicable', 'Select outlet model with client', 'Finalize kitchen plan with supplier and appliance specs', 'Submit plan for project manager approval', 'File in client folder'] },
      { name: 'Lighting plan', estimated_days: 7, sort_order: 6,
        subtasks: ['Meeting with lighting consultant from supplier + document models', 'Meeting with drafter to hand over project info', 'Submit plan for PM approval - including lighting circuits and switches', 'File in client folder'] },
      { name: 'HVAC plan', estimated_days: 7, sort_order: 7,
        subtasks: ['Get plan from HVAC consultant or contractor - select grilles', 'Meeting with drafter to hand over project info', 'Submit plan for project manager approval', 'File in client folder'] },
      { name: 'Ceiling plan', estimated_days: 7, sort_order: 8, subtasks: PLAN_SUBTASKS },
      { name: 'Flooring plan', estimated_days: 7, sort_order: 9, subtasks: PLAN_SUBTASKS },
      { name: 'Advanced SketchUp (parallel to plans)', estimated_days: 10, sort_order: 10, subtasks: [] },
      { name: 'Client approval of plan set', estimated_days: 5, sort_order: 11, subtasks: [] },
      { name: 'Plan corrections', estimated_days: 5, sort_order: 12, subtasks: ['Send corrected set to client upon completion'] },
      { name: 'Send plan set to quantity surveyor', estimated_days: 7, sort_order: 13, subtasks: [] },
    ],
  },
  {
    name: 'Basic Material Selection', sort_order: 4,
    tasks: [
      { name: 'Select sanitary fixtures', estimated_days: 14, sort_order: 1, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select flooring for entire home', estimated_days: 14, sort_order: 2, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select parquet', estimated_days: 7, sort_order: 3, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select bathroom floor & wall tiles', estimated_days: 14, sort_order: 4, subtasks: MATERIAL_SUBTASKS },
      { name: 'Plan and select kitchen', estimated_days: 21, sort_order: 5, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select lighting fixtures', estimated_days: 7, sort_order: 6, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select decorative lighting fixtures', estimated_days: 7, sort_order: 7, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select bathroom vanity countertops', estimated_days: 7, sort_order: 8, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select kitchen countertop', estimated_days: 7, sort_order: 9, subtasks: MATERIAL_SUBTASKS },
      { name: 'Smart home system', estimated_days: 7, sort_order: 10, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select outlets and switches (if no smart home)', estimated_days: 7, sort_order: 11, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select aluminum / windows', estimated_days: 14, sort_order: 12, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select underfloor heating', estimated_days: 7, sort_order: 13, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select HVAC contractor', estimated_days: 7, sort_order: 14, subtasks: [] },
      { name: 'Select audio/video and alarm systems', estimated_days: 7, sort_order: 15, subtasks: [] },
      { name: 'Select appliances', estimated_days: 7, sort_order: 16, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select water filtration system', estimated_days: 5, sort_order: 17, subtasks: [] },
      { name: 'Select glazing', estimated_days: 7, sort_order: 18, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select carpenter', estimated_days: 14, sort_order: 19, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select ceiling fans', estimated_days: 5, sort_order: 20, subtasks: [] },
      { name: 'Select doors', estimated_days: 14, sort_order: 21, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select entry door', estimated_days: 7, sort_order: 22, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select wallpaper', estimated_days: 7, sort_order: 23, subtasks: [] },
      { name: 'Select furniture', estimated_days: 21, sort_order: 24, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select curtains', estimated_days: 14, sort_order: 25, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select bathroom accessories', estimated_days: 7, sort_order: 26, subtasks: MATERIAL_SUBTASKS },
    ],
  },
  {
    name: 'Consultant Support for Plans', sort_order: 5,
    tasks: [
      { name: 'Landscaping plan work', estimated_days: 7, sort_order: 1, subtasks: [] },
      { name: 'Address sprinkler requirements', estimated_days: 3, sort_order: 2, subtasks: [] },
      { name: 'Address consultants (electrical, lighting, structural)', estimated_days: 5, sort_order: 3, subtasks: [] },
    ],
  },
  {
    name: 'Working Plans - Advanced', sort_order: 6,
    tasks: [
      { name: 'Bathroom layouts', estimated_days: 10, sort_order: 1, subtasks: PLAN_SUBTASKS },
      { name: 'Photorealistic renderings (optional)', estimated_days: 14, sort_order: 2, subtasks: [] },
      { name: 'Carpentry plans', estimated_days: 14, sort_order: 3, subtasks: PLAN_SUBTASKS },
    ],
  },
  {
    name: 'Advanced Material Selection', sort_order: 7,
    tasks: [
      { name: 'Select decorative lighting (optional)', estimated_days: 14, sort_order: 1, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select home accessories', estimated_days: 7, sort_order: 2, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select artwork', estimated_days: 7, sort_order: 3, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select kitchenware and linens', estimated_days: 7, sort_order: 4, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select rugs', estimated_days: 7, sort_order: 5, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select bathroom accessories', estimated_days: 7, sort_order: 6, subtasks: MATERIAL_SUBTASKS },
      { name: 'Select decorative items', estimated_days: 7, sort_order: 7, subtasks: MATERIAL_SUBTASKS },
    ],
  },
  {
    name: 'Execution', sort_order: 8,
    tasks: [
      { name: 'Client meetings - review carpentry and plans', estimated_days: null, sort_order: 1, subtasks: [] },
      { name: 'Weekly client update', estimated_days: null, sort_order: 2, subtasks: [] },
    ],
  },
  {
    name: 'Project Completion', sort_order: 9,
    tasks: [
      { name: 'Superior supervision', estimated_days: 7, sort_order: 1, subtasks: [] },
      { name: 'Rejection rounds with contractors + furniture placement', estimated_days: 14, sort_order: 2, subtasks: [] },
      { name: 'Professional photography', estimated_days: 3, sort_order: 3, subtasks: [] },
    ],
  },
];

async function seed() {
  console.log('Deleting old contents...');
  await supabase.from('contents').delete().eq('level', 'subtask');
  await supabase.from('contents').delete().eq('level', 'task');
  await supabase.from('contents').delete().eq('level', 'phase');

  let totalItems = 0;

  for (const phase of SCOPE_TEMPLATE) {
    const { data: phaseRow, error: pe } = await supabase.from('contents').insert({
      name: phase.name, level: 'phase', category: phase.name,
      sort_order: phase.sort_order, estimated_days: null,
    }).select().single();

    if (pe) { console.log('Phase error:', pe.message, phase.name); continue; }
    totalItems++;

    for (const task of phase.tasks) {
      const { data: taskRow, error: te } = await supabase.from('contents').insert({
        name: task.name, level: 'task', parent_id: phaseRow.id,
        category: phase.name, sort_order: task.sort_order,
        estimated_days: task.estimated_days,
      }).select().single();

      if (te) { console.log('Task error:', te.message, task.name); continue; }
      totalItems++;

      for (let i = 0; i < task.subtasks.length; i++) {
        const { error: se } = await supabase.from('contents').insert({
          name: task.subtasks[i], level: 'subtask', parent_id: taskRow.id,
          category: phase.name, sort_order: i + 1, estimated_days: null,
        });
        if (se) { console.log('Subtask error:', se.message); continue; }
        totalItems++;
      }
    }
    console.log('Done:', phase.name);
  }

  console.log('\nTotal items seeded:', totalItems);
}

seed();
