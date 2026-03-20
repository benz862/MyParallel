/**
 * MyParallel — Family Care Service
 * Handles family member management, invitations, permissions, and alerts
 */
import crypto from 'crypto';

class FamilyService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  // ═══════════════════════════════════════════
  // FAMILY MEMBERS
  // ═══════════════════════════════════════════
  async getFamilyMembers(patientId) {
    const { data, error } = await this.supabase
      .from('family_members')
      .select('*, family_access_permissions(*)')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }

  async inviteFamilyMember(patientId, memberData, invitedBy) {
    const inviteCode = crypto.randomBytes(16).toString('hex');

    const { data: member, error } = await this.supabase
      .from('family_members')
      .insert({
        patient_id: patientId,
        full_name: memberData.full_name,
        relationship: memberData.relationship,
        email: memberData.email,
        phone: memberData.phone,
        role: memberData.role || 'viewer',
        invite_code: inviteCode,
        invite_status: 'pending',
        invited_by: invitedBy,
      })
      .select()
      .single();
    if (error) throw error;

    // Create default permissions based on role
    const perms = this._defaultPermissions(member.role);
    await this.supabase.from('family_access_permissions').insert({
      family_member_id: member.id,
      ...perms,
    });

    return { member, inviteCode };
  }

  async acceptInvite(inviteCode, userId) {
    const { data: member, error } = await this.supabase
      .from('family_members')
      .update({ 
        invite_status: 'accepted', 
        user_id: userId, 
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('invite_code', inviteCode)
      .eq('invite_status', 'pending')
      .select()
      .single();
    if (error) throw error;
    return member;
  }

  async lookupByInviteCode(inviteCode) {
    const { data, error } = await this.supabase
      .from('family_members')
      .select('*, family_access_permissions(*)')
      .eq('invite_code', inviteCode)
      .single();
    if (error) throw error;
    return data;
  }

  async getFamilyMemberByUserId(userId) {
    const { data, error } = await this.supabase
      .from('family_members')
      .select('*, family_access_permissions(*)')
      .eq('user_id', userId)
      .eq('is_active', true);
    if (error) throw error;
    return data;
  }

  async updatePermissions(familyMemberId, permissions) {
    const { data, error } = await this.supabase
      .from('family_access_permissions')
      .update({ ...permissions, updated_at: new Date().toISOString() })
      .eq('family_member_id', familyMemberId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async removeFamilyMember(familyMemberId) {
    await this.supabase.from('family_members')
      .update({ is_active: false, invite_status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', familyMemberId);
  }

  // ═══════════════════════════════════════════
  // ALERTS / FEED
  // ═══════════════════════════════════════════
  async createAlert(patientId, alertData) {
    // Get all active family members for this patient who should receive this type
    const { data: members } = await this.supabase
      .from('family_members')
      .select('id, family_access_permissions(*)')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .eq('invite_status', 'accepted');

    if (!members || members.length === 0) return [];

    const alerts = [];
    for (const m of members) {
      const perms = m.family_access_permissions?.[0] || {};
      
      // Check if this member should receive this alert type
      let shouldReceive = perms.can_receive_alerts;
      if (alertData.severity === 'urgent' || alertData.severity === 'critical') {
        shouldReceive = perms.can_receive_urgent_alerts;
      }
      if (!shouldReceive) continue;

      alerts.push({
        patient_id: patientId,
        family_member_id: m.id,
        alert_type: alertData.alert_type,
        severity: alertData.severity || 'info',
        title: alertData.title,
        body: alertData.body,
        reference_type: alertData.reference_type,
        reference_id: alertData.reference_id,
        delivered_via: ['in_app'],
      });
    }

    if (alerts.length === 0) return [];

    const { data, error } = await this.supabase
      .from('family_alerts')
      .insert(alerts)
      .select();
    if (error) throw error;
    return data;
  }

  async getAlerts(familyMemberId, limit = 50) {
    const { data, error } = await this.supabase
      .from('family_alerts')
      .select('*')
      .eq('family_member_id', familyMemberId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  }

  async markAlertRead(alertId) {
    await this.supabase.from('family_alerts')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', alertId);
  }

  async getUnreadCount(familyMemberId) {
    const { count, error } = await this.supabase
      .from('family_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('family_member_id', familyMemberId)
      .eq('is_read', false);
    if (error) throw error;
    return count || 0;
  }

  // ═══════════════════════════════════════════
  // FAMILY DASHBOARD DATA
  // ═══════════════════════════════════════════
  async getFamilyDashboardData(familyMemberId) {
    const { data: member } = await this.supabase
      .from('family_members')
      .select('*, family_access_permissions(*)')
      .eq('id', familyMemberId)
      .single();
    
    if (!member) throw new Error('Family member not found');
    const perms = member.family_access_permissions?.[0] || {};
    const patientId = member.patient_id;

    // Get patient basic info
    const { data: patient } = await this.supabase
      .from('user_profiles')
      .select('id, full_name, preferred_name, age, conditions, photo_url')
      .eq('id', patientId)
      .single();

    const dashboard = { patient, permissions: perms, alerts: [], medications: null, appointments: null, careTasks: null };

    // Recent alerts
    dashboard.alerts = await this.getAlerts(familyMemberId, 20);
    dashboard.unreadCount = await this.getUnreadCount(familyMemberId);

    // Medication adherence (if permitted)
    if (perms.can_view_medications || perms.can_view_adherence) {
      const today = new Date().toISOString().split('T')[0];
      const { data: medEvents } = await this.supabase
        .from('medication_schedule_events')
        .select('*')
        .eq('patient_id', patientId)
        .is('invalidated_at', null)
        .gte('scheduled_for', `${today}T00:00:00Z`)
        .lte('scheduled_for', `${today}T23:59:59Z`)
        .order('scheduled_for');
      
      const meds = medEvents || [];
      dashboard.medications = {
        total: meds.length,
        taken: meds.filter(m => m.status === 'taken').length,
        missed: meds.filter(m => m.status === 'missed').length,
        due: meds.filter(m => m.status === 'due').length,
        items: meds.map(m => ({ name: m.medication_name, time: m.scheduled_for, status: m.status, dose: m.dose_text })),
      };
    }

    // Upcoming appointments (if permitted)
    if (perms.can_view_appointments) {
      const now = new Date().toISOString();
      const weekOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: events } = await this.supabase
        .from('calendar_events')
        .select('id, title, description, start_time')
        .eq('user_id', patientId)
        .gte('start_time', now)
        .lte('start_time', weekOut)
        .order('start_time');
      dashboard.appointments = events || [];
    }

    // Care tasks (if permitted)
    if (perms.can_view_care_tasks) {
      const today = new Date().toISOString().split('T')[0];
      const { data: tasks } = await this.supabase
        .from('care_task_instances')
        .select('*')
        .eq('patient_id', patientId)
        .eq('scheduled_date', today)
        .order('scheduled_time');
      
      const t = tasks || [];
      dashboard.careTasks = {
        total: t.length,
        completed: t.filter(x => x.status === 'completed').length,
        pending: t.filter(x => x.status === 'pending').length,
        items: t.map(x => ({ title: x.title, icon: x.icon, status: x.status, time: x.scheduled_time })),
      };
    }

    return dashboard;
  }

  // ═══════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════
  _defaultPermissions(role) {
    switch (role) {
      case 'primary_family':
        return {
          can_view_medications: true, can_view_adherence: true, can_view_appointments: true,
          can_view_vitals: true, can_view_care_tasks: true, can_view_incidents: true,
          can_view_care_notes: true, can_view_documents: false, can_message_caregiver: true,
          can_receive_alerts: true, can_receive_daily_summary: true, can_receive_urgent_alerts: true,
        };
      case 'secondary_caregiver':
        return {
          can_view_medications: true, can_view_adherence: true, can_view_appointments: true,
          can_view_vitals: true, can_view_care_tasks: true, can_view_incidents: true,
          can_view_care_notes: false, can_view_documents: false, can_message_caregiver: true,
          can_receive_alerts: true, can_receive_daily_summary: true, can_receive_urgent_alerts: true,
        };
      case 'supportive':
        return {
          can_view_medications: true, can_view_adherence: true, can_view_appointments: true,
          can_view_vitals: false, can_view_care_tasks: true, can_view_incidents: false,
          can_view_care_notes: false, can_view_documents: false, can_message_caregiver: true,
          can_receive_alerts: true, can_receive_daily_summary: true, can_receive_urgent_alerts: true,
        };
      case 'emergency_only':
        return {
          can_view_medications: false, can_view_adherence: false, can_view_appointments: false,
          can_view_vitals: false, can_view_care_tasks: false, can_view_incidents: false,
          can_view_care_notes: false, can_view_documents: false, can_message_caregiver: false,
          can_receive_alerts: false, can_receive_daily_summary: false, can_receive_urgent_alerts: true,
        };
      default: // viewer
        return {
          can_view_medications: true, can_view_adherence: true, can_view_appointments: true,
          can_view_vitals: false, can_view_care_tasks: true, can_view_incidents: false,
          can_view_care_notes: false, can_view_documents: false, can_message_caregiver: true,
          can_receive_alerts: true, can_receive_daily_summary: true, can_receive_urgent_alerts: true,
        };
    }
  }
}

export { FamilyService };
