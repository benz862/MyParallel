/**
 * MyParallel — Medication Service Layer
 * Handles CRUD, versioning, schedule generation, and calendar regeneration.
 */

// ────────────────────────────────────────────
// Instruction Profile → Display Summary
// ────────────────────────────────────────────
function buildInstructionSummary(profile) {
  const lines = [];
  if (profile.take_with_food) lines.push('Take with food');
  if (profile.take_before_meal) lines.push('Take before meals');
  if (profile.take_after_meal) lines.push('Take after meals');
  if (profile.empty_stomach) lines.push('Take on an empty stomach');
  if (profile.take_with_water) lines.push('Take with water');
  if (profile.required_fluid_amount_text) lines.push(profile.required_fluid_amount_text);
  if (profile.morning_only) lines.push('Morning dose only');
  if (profile.afternoon_only) lines.push('Afternoon dose only');
  if (profile.evening_only) lines.push('Evening dose only');
  if (profile.bedtime_only) lines.push('Bedtime dose only');
  if (profile.do_not_crush) lines.push('Do not crush');
  if (profile.do_not_split) lines.push('Do not split');
  if (profile.do_not_chew) lines.push('Do not chew');
  if (profile.remain_upright_minutes) lines.push(`Remain upright for ${profile.remain_upright_minutes} minutes after taking`);
  if (profile.avoid_alcohol) lines.push('Avoid alcohol');
  if (profile.avoid_dairy) lines.push('Avoid dairy');
  if (profile.avoid_grapefruit) lines.push('Avoid grapefruit');
  if (profile.avoid_other_medications_text) lines.push(profile.avoid_other_medications_text);
  if (profile.food_requirement_note) lines.push(profile.food_requirement_note);
  if (profile.drink_requirement_note) lines.push(profile.drink_requirement_note);
  if (profile.special_handling_note) lines.push(profile.special_handling_note);
  if (profile.warning_note) lines.push(`⚠️ ${profile.warning_note}`);
  if (profile.monitoring_required && profile.monitoring_note) lines.push(`Monitor: ${profile.monitoring_note}`);
  if (profile.hold_if_condition_text) lines.push(`Hold if: ${profile.hold_if_condition_text}`);
  if (profile.prn_condition_text) lines.push(`PRN: ${profile.prn_condition_text}`);
  if (profile.custom_instruction_note) lines.push(profile.custom_instruction_note);
  return lines.join('\n');
}

// ────────────────────────────────────────────
// Generate schedule events for a date range
// ────────────────────────────────────────────
function generateDoseTimestamps(version, fromDate, toDate, timezone) {
  const times = version.specific_times || ['08:00'];
  const freq = version.frequency_type || 'once_daily';
  const events = [];
  
  const start = new Date(fromDate);
  const end = new Date(toDate);
  const day = new Date(start);
  
  while (day <= end) {
    let shouldInclude = false;
    
    if (freq === 'once_daily' || freq === 'twice_daily' || freq === 'three_times_daily') {
      shouldInclude = true;
    } else if (freq === 'every_other_day') {
      const effectiveStart = new Date(version.effective_start_at);
      const diffDays = Math.floor((day - effectiveStart) / (1000 * 60 * 60 * 24));
      shouldInclude = diffDays % 2 === 0;
    } else if (freq === 'weekly') {
      const rule = version.recurrence_rule;
      if (rule) {
        try {
          const weekdays = JSON.parse(rule);
          const dayName = day.toLocaleDateString('en-US', { weekday: 'short', timeZone: timezone });
          shouldInclude = weekdays.includes(dayName);
        } catch { shouldInclude = true; }
      } else {
        shouldInclude = true;
      }
    } else if (freq === 'bi_weekly') {
      const effectiveStart = new Date(version.effective_start_at);
      const diffDays = Math.floor((day - effectiveStart) / (1000 * 60 * 60 * 24));
      shouldInclude = diffDays % 14 === 0;
    } else if (freq === 'monthly') {
      const effectiveStart = new Date(version.effective_start_at);
      shouldInclude = day.getDate() === effectiveStart.getDate();
    } else if (freq === 'prn') {
      shouldInclude = false; // PRN = as needed, no auto-schedule
    } else {
      shouldInclude = true;
    }
    
    if (shouldInclude) {
      for (const timeStr of times) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const eventDate = new Date(day);
        eventDate.setHours(hours, minutes, 0, 0);
        
        // Convert local time to UTC for storage
        const localStr = eventDate.toLocaleString('en-US', { timeZone: timezone });
        const asLocal = new Date(localStr + ' UTC');
        const utcMs = eventDate.getTime();
        const offset = utcMs - asLocal.getTime();
        const utcDate = new Date(utcMs + offset);
        
        if (utcDate >= start && utcDate <= end) {
          events.push(utcDate);
        }
      }
    }
    
    day.setDate(day.getDate() + 1);
  }
  
  return events;
}

// ────────────────────────────────────────────
// Service Class
// ────────────────────────────────────────────
class MedicationService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  // ═══════════════════════════════════════════
  // CREATE — Full medication + assignment + v1
  // ═══════════════════════════════════════════
  async createMedication(patientId, masterData, instructionData, regimenData, createdBy = null) {
    const db = this.supabase;

    // 1. Create medication master
    const { data: master, error: masterErr } = await db
      .from('medications_master')
      .insert({
        name: masterData.name,
        generic_name: masterData.generic_name,
        brand_name: masterData.brand_name,
        dosage_strength: masterData.dosage_strength,
        strength_unit: masterData.strength_unit,
        form: masterData.form || 'tablet',
        purpose: masterData.purpose,
        prescriber_name: masterData.prescriber_name,
        pharmacy_name: masterData.pharmacy_name,
        is_prn: masterData.is_prn || false,
        is_controlled: masterData.is_controlled || false,
      })
      .select()
      .single();
    if (masterErr) throw masterErr;

    // 2. Create instruction profile
    const instructionSummary = buildInstructionSummary(instructionData);
    const { data: instructionProfile, error: instrErr } = await db
      .from('medication_instruction_profiles')
      .insert({
        medication_master_id: master.id,
        ...instructionData,
        instruction_summary: instructionSummary,
      })
      .select()
      .single();
    if (instrErr) throw instrErr;

    // 3. Create patient assignment
    const { data: assignment, error: assignErr } = await db
      .from('patient_medication_assignments')
      .insert({
        patient_id: patientId,
        medication_master_id: master.id,
        status: 'active',
        created_by: createdBy,
      })
      .select()
      .single();
    if (assignErr) throw assignErr;

    // 4. Create initial version (v1)
    const doseText = `${regimenData.assigned_dose_amount || masterData.dosage_strength || ''} ${regimenData.assigned_dose_unit || masterData.strength_unit || ''}`.trim();
    const { data: version, error: verErr } = await db
      .from('patient_medication_versions')
      .insert({
        patient_medication_assignment_id: assignment.id,
        version_number: 1,
        change_type: 'initial',
        source_of_change: 'manual',
        assigned_dose_amount: regimenData.assigned_dose_amount || masterData.dosage_strength,
        assigned_dose_unit: regimenData.assigned_dose_unit || masterData.strength_unit,
        route: regimenData.route || 'oral',
        frequency_type: regimenData.frequency_type || 'once_daily',
        recurrence_rule: regimenData.recurrence_rule || null,
        specific_times: regimenData.specific_times || ['08:00'],
        effective_start_at: regimenData.effective_start_at || new Date().toISOString(),
        is_active: true,
        snapshot_medication_name: master.name,
        snapshot_strength: `${masterData.dosage_strength || ''} ${masterData.strength_unit || ''}`.trim(),
        snapshot_instruction_summary: instructionSummary,
        snapshot_instruction_profile: instructionData,
        snapshot_schedule_profile: regimenData,
        created_by: createdBy,
      })
      .select()
      .single();
    if (verErr) throw verErr;

    // 5. Generate schedule events for next 30 days
    const patientTz = await this._getPatientTimezone(patientId);
    await this._generateScheduleEvents(patientId, assignment.id, version, master.name, doseText, regimenData.route || 'oral', instructionSummary, instructionData, patientTz, 30);

    // 6. Audit log
    await this._auditLog(patientId, assignment.id, null, version.id, 'initial', `Created ${master.name}`, createdBy);

    return { master, instructionProfile, assignment, version };
  }

  // ═══════════════════════════════════════════
  // UPDATE INSTRUCTIONS ONLY
  // ═══════════════════════════════════════════
  async updateInstructions(assignmentId, newInstructions, effectiveDate, changedBy = null) {
    const db = this.supabase;

    // Get current state
    const { data: assignment } = await db.from('patient_medication_assignments').select('*, medications_master(*)').eq('id', assignmentId).single();
    if (!assignment) throw new Error('Assignment not found');

    const { data: currentVersion } = await db.from('patient_medication_versions')
      .select('*').eq('patient_medication_assignment_id', assignmentId).eq('is_active', true).single();
    if (!currentVersion) throw new Error('No active version');

    // Update the instruction profile
    const newSummary = buildInstructionSummary(newInstructions);
    await db.from('medication_instruction_profiles')
      .update({ ...newInstructions, instruction_summary: newSummary, updated_at: new Date().toISOString() })
      .eq('medication_master_id', assignment.medication_master_id);

    // Create new version
    const newVersionNumber = currentVersion.version_number + 1;
    const { data: newVersion, error: verErr } = await db
      .from('patient_medication_versions')
      .insert({
        ...currentVersion,
        id: undefined,
        created_at: undefined,
        version_number: newVersionNumber,
        change_type: 'instruction_change',
        change_reason: 'Medication instructions updated',
        effective_start_at: effectiveDate || new Date().toISOString(),
        snapshot_instruction_summary: newSummary,
        snapshot_instruction_profile: newInstructions,
        created_by: changedBy,
      })
      .select()
      .single();
    if (verErr) throw verErr;

    // Close old version
    await db.from('patient_medication_versions').update({ is_active: false, effective_end_at: effectiveDate || new Date().toISOString() }).eq('id', currentVersion.id);

    // Invalidate future schedule events and regenerate
    const patientTz = await this._getPatientTimezone(assignment.patient_id);
    await this._invalidateFutureEvents(assignmentId, effectiveDate || new Date().toISOString(), 'instruction_change');
    const doseText = `${newVersion.assigned_dose_amount || ''} ${newVersion.assigned_dose_unit || ''}`.trim();
    await this._generateScheduleEvents(assignment.patient_id, assignmentId, newVersion, newVersion.snapshot_medication_name, doseText, newVersion.route, newSummary, newInstructions, patientTz, 30);

    // Audit
    await this._auditLog(assignment.patient_id, assignmentId, currentVersion.id, newVersion.id, 'instruction_change', 'Instructions updated', changedBy);

    return newVersion;
  }

  // ═══════════════════════════════════════════
  // UPDATE TIMING / DOSAGE
  // ═══════════════════════════════════════════
  async updateTimingOrDosage(assignmentId, regimenChanges, effectiveDate, changeReason, changedBy = null) {
    const db = this.supabase;

    const { data: assignment } = await db.from('patient_medication_assignments').select('*, medications_master(*)').eq('id', assignmentId).single();
    if (!assignment) throw new Error('Assignment not found');

    const { data: currentVersion } = await db.from('patient_medication_versions')
      .select('*').eq('patient_medication_assignment_id', assignmentId).eq('is_active', true).single();
    if (!currentVersion) throw new Error('No active version');

    // Create new version with updated regimen
    const newVersionNumber = currentVersion.version_number + 1;
    const merged = { ...currentVersion, ...regimenChanges };
    const { data: newVersion, error: verErr } = await db
      .from('patient_medication_versions')
      .insert({
        patient_medication_assignment_id: assignmentId,
        version_number: newVersionNumber,
        change_type: 'dosage_timing_change',
        change_reason: changeReason || 'Dosage or timing updated',
        source_of_change: 'manual',
        assigned_dose_amount: merged.assigned_dose_amount,
        assigned_dose_unit: merged.assigned_dose_unit,
        route: merged.route,
        frequency_type: merged.frequency_type,
        recurrence_rule: merged.recurrence_rule,
        specific_times: merged.specific_times,
        effective_start_at: effectiveDate || new Date().toISOString(),
        is_active: true,
        snapshot_medication_name: currentVersion.snapshot_medication_name,
        snapshot_strength: `${merged.assigned_dose_amount || ''} ${merged.assigned_dose_unit || ''}`.trim(),
        snapshot_instruction_summary: currentVersion.snapshot_instruction_summary,
        snapshot_instruction_profile: currentVersion.snapshot_instruction_profile,
        snapshot_schedule_profile: regimenChanges,
        created_by: changedBy,
      })
      .select()
      .single();
    if (verErr) throw verErr;

    // Close old version
    await db.from('patient_medication_versions').update({ is_active: false, effective_end_at: effectiveDate || new Date().toISOString() }).eq('id', currentVersion.id);

    // Invalidate and regenerate
    const patientTz = await this._getPatientTimezone(assignment.patient_id);
    await this._invalidateFutureEvents(assignmentId, effectiveDate || new Date().toISOString(), 'dosage_timing_change');
    const doseText = `${newVersion.assigned_dose_amount || ''} ${newVersion.assigned_dose_unit || ''}`.trim();
    await this._generateScheduleEvents(assignment.patient_id, assignmentId, newVersion, newVersion.snapshot_medication_name, doseText, newVersion.route, newVersion.snapshot_instruction_summary, newVersion.snapshot_instruction_profile, patientTz, 30);

    await this._auditLog(assignment.patient_id, assignmentId, currentVersion.id, newVersion.id, 'dosage_timing_change', changeReason || 'Dosage/timing updated', changedBy);

    return newVersion;
  }

  // ═══════════════════════════════════════════
  // DISCONTINUE
  // ═══════════════════════════════════════════
  async discontinueMedication(assignmentId, effectiveDate, reason, changedBy = null) {
    const db = this.supabase;

    const { data: assignment } = await db.from('patient_medication_assignments').select('*').eq('id', assignmentId).single();
    if (!assignment) throw new Error('Assignment not found');

    // Mark assignment discontinued
    await db.from('patient_medication_assignments').update({ status: 'discontinued', updated_at: new Date().toISOString() }).eq('id', assignmentId);

    // Close active version
    await db.from('patient_medication_versions').update({ is_active: false, effective_end_at: effectiveDate || new Date().toISOString() })
      .eq('patient_medication_assignment_id', assignmentId).eq('is_active', true);

    // Invalidate all future events
    await this._invalidateFutureEvents(assignmentId, effectiveDate || new Date().toISOString(), 'discontinued');

    await this._auditLog(assignment.patient_id, assignmentId, null, null, 'discontinue', reason || 'Medication discontinued', changedBy);
  }

  // ═══════════════════════════════════════════
  // HOLD / RESUME
  // ═══════════════════════════════════════════
  async holdMedication(assignmentId, holdUntil, reason, changedBy = null) {
    const db = this.supabase;
    const { data: assignment } = await db.from('patient_medication_assignments').select('*').eq('id', assignmentId).single();
    if (!assignment) throw new Error('Assignment not found');

    await db.from('patient_medication_assignments').update({ status: 'on_hold', updated_at: new Date().toISOString() }).eq('id', assignmentId);
    await this._invalidateFutureEvents(assignmentId, new Date().toISOString(), `hold: ${reason}`);
    await this._auditLog(assignment.patient_id, assignmentId, null, null, 'hold', `Hold until ${holdUntil}: ${reason}`, changedBy);
  }

  async resumeMedication(assignmentId, changedBy = null) {
    const db = this.supabase;
    const { data: assignment } = await db.from('patient_medication_assignments').select('*, medications_master(*)').eq('id', assignmentId).single();
    if (!assignment) throw new Error('Assignment not found');

    await db.from('patient_medication_assignments').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', assignmentId);

    // Get active version and regenerate
    const { data: version } = await db.from('patient_medication_versions')
      .select('*').eq('patient_medication_assignment_id', assignmentId).order('version_number', { ascending: false }).limit(1).single();

    if (version) {
      await db.from('patient_medication_versions').update({ is_active: true, effective_end_at: null }).eq('id', version.id);
      const patientTz = await this._getPatientTimezone(assignment.patient_id);
      const doseText = `${version.assigned_dose_amount || ''} ${version.assigned_dose_unit || ''}`.trim();
      await this._generateScheduleEvents(assignment.patient_id, assignmentId, version, version.snapshot_medication_name, doseText, version.route, version.snapshot_instruction_summary, version.snapshot_instruction_profile, patientTz, 30);
    }

    await this._auditLog(assignment.patient_id, assignmentId, null, version?.id, 'resume', 'Medication resumed', changedBy);
  }

  // ═══════════════════════════════════════════
  // LOG ADMINISTRATION
  // ═══════════════════════════════════════════
  async logAdministration(scheduleEventId, status, details = {}) {
    const db = this.supabase;

    const { data: event } = await db.from('medication_schedule_events').select('*').eq('id', scheduleEventId).single();
    if (!event) throw new Error('Schedule event not found');

    const { data: log, error } = await db.from('medication_administration_logs').insert({
      medication_schedule_event_id: scheduleEventId,
      patient_id: event.patient_id,
      patient_medication_assignment_id: event.patient_medication_assignment_id,
      patient_medication_version_id: event.patient_medication_version_id,
      status,
      scheduled_for: event.scheduled_for,
      administered_at: status === 'taken' ? (details.administered_at || new Date().toISOString()) : null,
      recorded_by: details.recorded_by || null,
      reason_text: details.reason || null,
      note_text: details.note || null,
      snapshot_medication_name: event.medication_name,
      snapshot_dose_text: event.dose_text,
      snapshot_instruction_summary: event.instruction_summary,
      snapshot_instruction_profile: event.instruction_profile,
    }).select().single();
    if (error) throw error;

    // Update event status
    await db.from('medication_schedule_events').update({ status, updated_at: new Date().toISOString() }).eq('id', scheduleEventId);

    return log;
  }

  // ═══════════════════════════════════════════
  // READ — Queries
  // ═══════════════════════════════════════════
  async getPatientMedications(patientId) {
    const { data, error } = await this.supabase
      .from('patient_medication_assignments')
      .select(`
        *,
        medications_master(*),
        patient_medication_versions(*)
      `)
      .eq('patient_id', patientId)
      .in('status', ['active', 'on_hold'])
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async getScheduleEvents(patientId, startDate, endDate) {
    const { data, error } = await this.supabase
      .from('medication_schedule_events')
      .select('*')
      .eq('patient_id', patientId)
      .is('invalidated_at', null)
      .gte('scheduled_for', startDate)
      .lte('scheduled_for', endDate)
      .order('scheduled_for', { ascending: true });
    if (error) throw error;
    return data;
  }

  async getAuditLog(assignmentId) {
    const { data, error } = await this.supabase
      .from('medication_change_audit_logs')
      .select('*')
      .eq('patient_medication_assignment_id', assignmentId)
      .order('changed_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  // ═══════════════════════════════════════════
  // INTERNAL HELPERS
  // ═══════════════════════════════════════════
  async _getPatientTimezone(patientId) {
    const { data } = await this.supabase.from('user_profiles').select('timezone').eq('id', patientId).single();
    return data?.timezone || 'America/New_York';
  }

  async _invalidateFutureEvents(assignmentId, fromDate, reason) {
    await this.supabase
      .from('medication_schedule_events')
      .update({ invalidated_at: new Date().toISOString(), invalidation_reason: reason })
      .eq('patient_medication_assignment_id', assignmentId)
      .is('invalidated_at', null)
      .gte('scheduled_for', fromDate)
      .in('status', ['due']);
  }

  async _generateScheduleEvents(patientId, assignmentId, version, medName, doseText, route, summary, profile, timezone, daysAhead) {
    const from = new Date(version.effective_start_at > new Date().toISOString() ? version.effective_start_at : new Date().toISOString());
    const to = new Date(from);
    to.setDate(to.getDate() + daysAhead);

    const timestamps = generateDoseTimestamps(version, from, to, timezone);

    if (timestamps.length === 0) return;

    const rows = timestamps.map(ts => ({
      patient_id: patientId,
      patient_medication_assignment_id: assignmentId,
      patient_medication_version_id: version.id,
      scheduled_for: ts.toISOString(),
      medication_name: medName,
      dose_text: doseText,
      route: route || 'oral',
      instruction_summary: summary,
      instruction_profile: profile,
      status: 'due',
    }));

    const { error } = await this.supabase.from('medication_schedule_events').insert(rows);
    if (error) console.error('[MedService] Schedule generation error:', error);
  }

  async _auditLog(patientId, assignmentId, oldVersionId, newVersionId, changeType, summary, changedBy) {
    await this.supabase.from('medication_change_audit_logs').insert({
      patient_id: patientId,
      patient_medication_assignment_id: assignmentId,
      old_version_id: oldVersionId,
      new_version_id: newVersionId,
      change_type: changeType,
      change_summary: summary,
      changed_by: changedBy,
    });
  }
}

export { MedicationService, buildInstructionSummary };
