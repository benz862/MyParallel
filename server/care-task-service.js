/**
 * MyParallel — Daily Care Task Service
 * Handles task templates, daily instance generation, status updates
 */

class CareTaskService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  // ═══════════════════════════════════════════
  // TEMPLATES — Reusable task definitions
  // ═══════════════════════════════════════════
  async getTemplates(patientId) {
    const { data, error } = await this.supabase
      .from('care_task_templates')
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .order('default_time', { ascending: true });
    if (error) throw error;
    return data;
  }

  async createTemplate(templateData) {
    const { data, error } = await this.supabase
      .from('care_task_templates')
      .insert(templateData)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateTemplate(templateId, updates) {
    const { data, error } = await this.supabase
      .from('care_task_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', templateId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteTemplate(templateId) {
    await this.supabase.from('care_task_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', templateId);
  }

  // ═══════════════════════════════════════════
  // INSTANCES — Daily generated tasks
  // ═══════════════════════════════════════════
  async getTasksForDate(patientId, date) {
    const { data, error } = await this.supabase
      .from('care_task_instances')
      .select('*')
      .eq('patient_id', patientId)
      .eq('scheduled_date', date)
      .order('scheduled_time', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false });
    if (error) throw error;
    return data;
  }

  async generateDailyTasks(patientId, date) {
    const dayName = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
    const dayOfWeek = new Date(date + 'T12:00:00').getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Check if tasks already exist for this date
    const { data: existing } = await this.supabase
      .from('care_task_instances')
      .select('id')
      .eq('patient_id', patientId)
      .eq('scheduled_date', date)
      .limit(1);

    if (existing && existing.length > 0) return existing;

    // Get active templates
    const templates = await this.getTemplates(patientId);
    const tasks = [];

    for (const t of templates) {
      let shouldCreate = false;
      if (t.recurrence_type === 'daily') shouldCreate = true;
      else if (t.recurrence_type === 'weekdays' && !isWeekend) shouldCreate = true;
      else if (t.recurrence_type === 'weekends' && isWeekend) shouldCreate = true;
      else if (t.recurrence_type === 'weekly' || t.recurrence_type === 'custom') {
        const days = t.recurrence_days || [];
        shouldCreate = days.includes(dayName);
      }

      if (shouldCreate) {
        tasks.push({
          template_id: t.id,
          patient_id: patientId,
          title: t.title,
          description: t.description,
          category: t.category,
          icon: t.icon,
          scheduled_date: date,
          scheduled_time: t.default_time,
          priority: t.priority,
          status: 'pending',
        });
      }
    }

    if (tasks.length === 0) return [];

    const { data, error } = await this.supabase
      .from('care_task_instances')
      .insert(tasks)
      .select();
    if (error) throw error;
    return data;
  }

  async updateTaskStatus(taskId, status, completedBy = null, notes = null) {
    const updates = {
      status,
      updated_at: new Date().toISOString(),
      notes,
    };
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
      updates.completed_by = completedBy;
    }

    const { data, error } = await this.supabase
      .from('care_task_instances')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async addQuickTask(patientId, date, title, category = 'custom', priority = 'normal') {
    const { data, error } = await this.supabase
      .from('care_task_instances')
      .insert({
        patient_id: patientId,
        title,
        category,
        icon: CATEGORY_ICONS[category] || '📋',
        scheduled_date: date,
        priority,
        status: 'pending',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Daily summary stats
  async getDailySummary(patientId, date) {
    const tasks = await this.getTasksForDate(patientId, date);
    return {
      date,
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      skipped: tasks.filter(t => t.status === 'skipped').length,
      refused: tasks.filter(t => t.status === 'refused').length,
      delayed: tasks.filter(t => t.status === 'delayed').length,
      completionRate: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0,
      tasks,
    };
  }

  // Seed default templates for a new patient
  async seedDefaultTemplates(patientId) {
    const defaults = [
      { title: 'Morning Hygiene', category: 'hygiene', icon: '🪥', default_time: '07:00', priority: 'normal' },
      { title: 'Breakfast', category: 'meals', icon: '🍳', default_time: '08:00', priority: 'normal' },
      { title: 'Morning Medications', category: 'medication', icon: '💊', default_time: '08:30', priority: 'high' },
      { title: 'Morning Vitals', category: 'vitals', icon: '🩺', default_time: '09:00', priority: 'high' },
      { title: 'Hydration Check', category: 'meals', icon: '💧', default_time: '10:00', priority: 'normal' },
      { title: 'Lunch', category: 'meals', icon: '🥗', default_time: '12:00', priority: 'normal' },
      { title: 'Afternoon Activity', category: 'exercise', icon: '🚶', default_time: '14:00', priority: 'normal' },
      { title: 'Emotional Check-In', category: 'emotional', icon: '💛', default_time: '15:00', priority: 'normal' },
      { title: 'Evening Medications', category: 'medication', icon: '💊', default_time: '18:00', priority: 'high' },
      { title: 'Dinner', category: 'meals', icon: '🍽️', default_time: '18:30', priority: 'normal' },
      { title: 'Evening Hygiene', category: 'hygiene', icon: '🛁', default_time: '20:00', priority: 'normal' },
      { title: 'Bedtime Routine', category: 'safety', icon: '🛏️', default_time: '21:00', priority: 'normal' },
    ];

    const rows = defaults.map(d => ({ ...d, patient_id: patientId, recurrence_type: 'daily' }));
    const { data, error } = await this.supabase.from('care_task_templates').insert(rows).select();
    if (error) throw error;
    return data;
  }
}

const CATEGORY_ICONS = {
  hygiene: '🪥', medication: '💊', meals: '🍽️', exercise: '🚶',
  vitals: '🩺', emotional: '💛', safety: '🛡️', custom: '📋', general: '📋',
};

export { CareTaskService, CATEGORY_ICONS };
