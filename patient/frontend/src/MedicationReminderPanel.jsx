import React, { useMemo, useState } from 'react';
import { Pill, Sun, Moon, Sunset, Coffee, AlertCircle, Clock, ChevronDown, ChevronUp, X } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   MedicationReminderPanel.jsx
   Smart medication schedule with duration awareness
   ═══════════════════════════════════════════════════════════ */

/* ── Duration parser: converts "5 days", "1 week", etc. to number of days ── */
function parseDurationToDays(dur) {
  if (!dur || typeof dur !== 'string') return Infinity;
  const d = dur.toLowerCase().trim();
  if (['ongoing', 'lifelong', 'continue', 'chronic', 'regular', 'daily', 'indefinite', 'long term', 'long-term'].some(k => d.includes(k))) return Infinity;
  if (['sos', 'as needed', 'prn', 'when required'].some(k => d.includes(k))) return Infinity;

  const numMatch = d.match(/(\d+)/);
  if (!numMatch) return Infinity;
  const num = parseInt(numMatch[1]);

  if (d.includes('day'))   return num;
  if (d.includes('week'))  return num * 7;
  if (d.includes('month')) return num * 30;
  if (d.includes('year'))  return num * 365;
  return num; // assume days if no unit
}

/* ── Frequency parser: maps to time slots ── */
function parseFrequencyToSlots(freq) {
  if (!freq || typeof freq !== 'string') return ['morning'];
  const f = freq.toLowerCase().trim();

  if (/\b(qid|four times|4 times)\b/.test(f))         return ['morning', 'afternoon', 'evening', 'night'];
  if (/\b(tds|tid|thrice|three times|3 times)\b/.test(f)) return ['morning', 'afternoon', 'night'];
  if (/\b(bd|bid|twice|two times|2 times)\b/.test(f))  return ['morning', 'night'];
  if (/\b(hs|bedtime|night|before sleep)\b/.test(f))    return ['night'];
  if (/\b(morning|breakfast|am)\b/.test(f))             return ['morning'];
  if (/\b(afternoon|lunch)\b/.test(f))                  return ['afternoon'];
  if (/\b(evening|dinner)\b/.test(f))                   return ['evening'];
  if (/\b(od|once daily|once a day|daily)\b/.test(f))   return ['morning'];
  if (/\b(sos|as needed|prn|when required)\b/.test(f))  return ['sos'];
  return ['morning']; // default
}

/* ── Determine medication type ── */
function getMedType(med, durationDays) {
  const f = (med.frequency || '').toLowerCase();
  if (/\b(sos|as needed|prn|when required)\b/.test(f)) return 'sos';
  if (durationDays === Infinity) return 'chronic';
  return 'course';
}

/* ── Meal timing from frequency/purpose ── */
function getMealNote(med) {
  const combined = ((med.frequency || '') + ' ' + (med.purpose || '')).toLowerCase();
  if (/before (meal|food|breakfast|lunch|dinner|eating)/.test(combined)) return 'before meals';
  if (/after (meal|food|breakfast|lunch|dinner|eating)/.test(combined)) return 'after meals';
  if (/with (meal|food)/.test(combined)) return 'with meals';
  if (/empty stomach/.test(combined)) return 'empty stomach';
  return null;
}

/* ── LocalStorage helpers for manual overrides ── */
const STOPPED_KEY = 'medbridge_stopped_meds';
function getStoppedMeds() {
  try { return JSON.parse(localStorage.getItem(STOPPED_KEY) || '[]'); } catch { return []; }
}
function toggleStoppedMed(medKey) {
  const stopped = getStoppedMeds();
  const updated = stopped.includes(medKey) ? stopped.filter(k => k !== medKey) : [...stopped, medKey];
  localStorage.setItem(STOPPED_KEY, JSON.stringify(updated));
  return updated;
}

/* ── Time slot config ── */
const TIME_SLOTS = [
  { id: 'morning',   label: 'Morning',   time: '6 AM – 12 PM', icon: Sun,     color: 'var(--amber-500)' },
  { id: 'afternoon', label: 'Afternoon', time: '12 PM – 5 PM', icon: Coffee,  color: 'var(--clay-500)' },
  { id: 'evening',   label: 'Evening',   time: '5 PM – 9 PM',  icon: Sunset,  color: 'var(--violet-500)' },
  { id: 'night',     label: 'Night',     time: '9 PM – 6 AM',  icon: Moon,    color: 'var(--moss-600)' },
  { id: 'sos',       label: 'As Needed', time: 'When required', icon: AlertCircle, color: '#ef4444' },
];

/* ═══════════════════════════════════════════════════════════ */
export default function MedicationReminderPanel({ records }) {
  const [showAll, setShowAll] = useState(false);
  const [stoppedMeds, setStoppedMeds] = useState(getStoppedMeds);

  const { activeMeds, expiredMeds, schedule } = useMemo(() => {
    if (!records || records.length === 0) return { activeMeds: [], expiredMeds: [], schedule: {} };

    const allMeds = [];
    const sorted = [...records].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    sorted.forEach(rec => {
      let parsed = null;
      try { parsed = JSON.parse(rec.extracted_text); } catch { return; }
      if (!parsed?.data?.medications) return;

      parsed.data.medications.forEach(med => {
        if (!med.name) return;
        allMeds.push({
          ...med,
          name: med.name.trim(),
          recordDate: rec.created_at,
          recordId: rec.id,
        });
      });
    });

    // Deduplicate: latest record wins per medication name
    const dedupMap = new Map();
    allMeds.forEach(med => {
      const key = med.name.toLowerCase().replace(/\s+/g, ' ');
      if (!dedupMap.has(key)) dedupMap.set(key, med);
    });
    const uniqueMeds = Array.from(dedupMap.values());

    // Classify each medication
    const now = new Date();
    const active = [];
    const expired = [];

    uniqueMeds.forEach(med => {
      const durationDays = parseDurationToDays(med.duration);
      const startDate = new Date(med.recordDate);
      const endDate = durationDays === Infinity ? null : new Date(startDate.getTime() + durationDays * 86400000);
      const isExpired = endDate && endDate < now;
      const type = getMedType(med, durationDays);
      const medKey = med.name.toLowerCase().replace(/\s+/g, ' ');
      const isStopped = stoppedMeds.includes(medKey);

      const daysPassed = Math.floor((now - startDate) / 86400000) + 1;
      const daysRemaining = endDate ? Math.max(0, Math.ceil((endDate - now) / 86400000)) : null;

      const enriched = {
        ...med,
        type,
        durationDays,
        startDate,
        endDate,
        isExpired: isExpired || false,
        isStopped,
        daysPassed,
        daysRemaining,
        daysTotal: durationDays === Infinity ? null : durationDays,
        mealNote: getMealNote(med),
        slots: parseFrequencyToSlots(med.frequency),
        medKey,
      };

      if (isExpired || isStopped) {
        expired.push(enriched);
      } else {
        active.push(enriched);
      }
    });

    // Build schedule by time slot
    const sched = {};
    TIME_SLOTS.forEach(slot => { sched[slot.id] = []; });
    active.forEach(med => {
      med.slots.forEach(slotId => {
        if (sched[slotId]) sched[slotId].push(med);
      });
    });

    return { activeMeds: active, expiredMeds: expired, schedule: sched };
  }, [records, stoppedMeds]);

  const handleToggleStop = (medKey) => {
    const updated = toggleStoppedMed(medKey);
    setStoppedMeds(updated);
  };

  if (activeMeds.length === 0 && expiredMeds.length === 0) return null;

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-xl)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 14px',
        borderBottom: '1px solid var(--border-soft)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          <Pill size={14} strokeWidth={2} />
          Medication Schedule
        </div>
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}
        >
          {showAll ? 'Schedule' : 'All Meds'} {showAll ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {!showAll ? (
          /* ── TAB 1: Daily Schedule ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {TIME_SLOTS.map(slot => {
              const meds = schedule[slot.id] || [];
              if (meds.length === 0) return null;
              const SlotIcon = slot.icon;
              return (
                <div key={slot.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <SlotIcon size={13} strokeWidth={2} style={{ color: slot.color }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      {slot.label}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{slot.time}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {meds.map((med, i) => (
                      <div key={`${med.medKey}-${slot.id}-${i}`} style={{
                        padding: '10px 12px',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-soft)',
                        borderRadius: 'var(--r-md)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {med.name}
                            </span>
                            {med.dosage && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                                {med.dosage}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                            {/* Type badge */}
                            {med.type === 'chronic' && (
                              <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '99px', background: 'var(--moss-50)', color: 'var(--moss-700)', border: '1px solid var(--moss-200)' }}>
                                Chronic
                              </span>
                            )}
                            {med.type === 'course' && med.daysTotal && (
                              <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '99px', background: 'var(--violet-50)', color: 'var(--violet-600)', border: '1px solid var(--violet-100)' }}>
                                Day {Math.min(med.daysPassed, med.daysTotal)} of {med.daysTotal}
                              </span>
                            )}
                            {med.type === 'sos' && (
                              <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '99px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                SOS
                              </span>
                            )}
                            {/* Meal note */}
                            {med.mealNote && (
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                {med.mealNote}
                              </span>
                            )}
                            {/* Purpose */}
                            {med.purpose && (
                              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                · {med.purpose}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {activeMeds.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                No active medications found.
              </div>
            )}
          </div>
        ) : (
          /* ── TAB 2: All Medications ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[...activeMeds, ...expiredMeds].map((med, i) => (
              <div key={`${med.medKey}-${i}`} style={{
                padding: '10px 12px',
                background: med.isExpired || med.isStopped ? 'var(--bg-canvas)' : 'var(--bg-subtle)',
                border: '1px solid var(--border-soft)',
                borderRadius: 'var(--r-md)',
                opacity: med.isExpired || med.isStopped ? 0.6 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px', fontWeight: 600,
                      color: 'var(--text-primary)',
                      textDecoration: med.isStopped ? 'line-through' : 'none',
                    }}>
                      {med.name} {med.dosage ? `(${med.dosage})` : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {med.type === 'chronic' && <span style={{ color: 'var(--moss-600)', fontWeight: 600 }}>Chronic</span>}
                      {med.type === 'course' && !med.isExpired && <span style={{ color: 'var(--violet-600)', fontWeight: 600 }}>Day {Math.min(med.daysPassed, med.daysTotal || med.daysPassed)} of {med.daysTotal || '?'}</span>}
                      {med.isExpired && <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Completed</span>}
                      {med.isStopped && <span style={{ color: '#ef4444', fontWeight: 600 }}>Stopped</span>}
                      {med.frequency && <span>· {med.frequency}</span>}
                      {med.purpose && <span>· {med.purpose}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleStop(med.medKey)}
                    title={med.isStopped ? 'Resume medication' : 'Stop taking'}
                    style={{
                      background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                      padding: '4px 8px', cursor: 'pointer',
                      fontSize: '10px', fontWeight: 600,
                      color: med.isStopped ? 'var(--moss-600)' : 'var(--text-muted)',
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {med.isStopped ? 'Resume' : 'Stop'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expired medications summary (collapsed in schedule view) */}
        {!showAll && expiredMeds.length > 0 && (
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-soft)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={11} strokeWidth={2} />
              {expiredMeds.length} completed/stopped course{expiredMeds.length !== 1 ? 's' : ''}
              <button
                onClick={() => setShowAll(true)}
                style={{ background: 'none', border: 'none', color: 'var(--moss-600)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', marginLeft: '4px' }}
              >
                View all →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
