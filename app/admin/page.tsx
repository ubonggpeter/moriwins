'use client';
import { useEffect, useRef, useState } from 'react';
import { Gem, Layers, Brain, Pencil, Upload, Loader2, Check, FileText, Send, X, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import LoadingScreen from '@/components/LoadingScreen';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  balance: number;
  referralEarnings: number;
  totalGameWinnings: number;
  isAdmin: boolean;
  createdAt: string;
}

interface AdminWithdrawal {
  id: string;
  username: string;
  email: string;
  amount: number;
  status: string;
  type: string;
  adminNote: string | null;
  bankName: string;
  accountNumber: string;
  accountName: string;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'users' | 'withdrawals' | 'settings' | 'games' | 'send' | 'tournaments' | 'learn' | 'announce' | 'subadmins'>('users');
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<{ isAdmin: boolean; isSubAdmin: boolean; permissions: Record<string, boolean> } | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [balanceEdit, setBalanceEdit] = useState<Record<string, string>>({});

  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [noteEdit, setNoteEdit] = useState<Record<string, string>>({});

  const [threshold, setThreshold] = useState('10000');
  const [depositInfo, setDepositInfo] = useState('[]');
  const [leaderboardMin, setLeaderboardMin] = useState('0');
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [gameMuted, setGameMuted] = useState<Record<string, boolean>>({ mines: false, memory: false, recall: false });
  const [gameToggling, setGameToggling] = useState<Record<string, boolean>>({});
  const [minesStartingLives, setMinesStartingLives] = useState(3);
  const [memoryStartingLives, setMemoryStartingLives] = useState(3);
  const [livesSaved, setLivesSaved] = useState<string | null>(null);
  const [livesError, setLivesError] = useState<string | null>(null);

  interface RecallText { id: string; title: string; text_content: string; difficulty: string; disappears_after_reading: boolean; is_active: boolean; }
  const [recallTexts, setRecallTexts] = useState<RecallText[]>([]);
  const [showAddRecall, setShowAddRecall] = useState(false);
  const [newRecall, setNewRecall] = useState({ title: '', textContent: '', difficulty: 'Normal', disappearsAfterReading: false });
  const [recallSaving, setRecallSaving] = useState(false);
  const [recallUploadMode, setRecallUploadMode] = useState<'paste' | 'upload'>('paste');
  const [recallUploading, setRecallUploading] = useState(false);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ title: '', textContent: '', difficulty: 'Normal', disappearsAfterReading: false });
  const [editSaving, setEditSaving] = useState(false);
  const [editUploading, setEditUploading] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [sendEmails, setSendEmails] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  interface SendResult { credited: { email: string; username: string; amount: number }[]; notFound: string[]; }
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  const [resetConfirm, setResetConfirm] = useState('');
  const [resetAdminToo, setResetAdminToo] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{ usersReset: number; resetAdminToo: boolean } | null>(null);

  interface AdminTournament {
    id: string; game_type: string; entry_bet: number; start_time: string;
    status: string; entry_count: number; total_pool: number; winner_count: number;
  }
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [tGameType, setTGameType] = useState('mines');
  const [tEntryBet, setTEntryBet] = useState('50');
  const [tStartNow, setTStartNow] = useState(true);
  const [tStartTime, setTStartTime] = useState('');
  const [tDurationMinutes, setTDurationMinutes] = useState(60);
  const [tDurationCustom, setTDurationCustom] = useState('');
  const [tDurationUnit, setTDurationUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');
  const [tCreating, setTCreating] = useState(false);
  const [tEnding, setTEnding] = useState<string | null>(null);
  interface EndResult { status: string; totalEntries: number; winnersCount: number; prizePool: number; distributed: number; }
  const [tEndResult, setTEndResult] = useState<Record<string, EndResult>>({});

  interface AdminCourse {
    id: string; title: string; description: string; price: number;
    video_url: string; thumbnail_url: string; is_active: boolean;
    purchase_count: number; created_at: string;
  }
  interface CourseQuestion {
    id: string; course_id: string; question_text: string;
    options: string[]; correct_answer_index: number;
  }
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [cTitle, setCTitle] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cPrice, setCPrice] = useState('0');
  const [cVideoUrl, setCVideoUrl] = useState('');
  const [cThumbUrl, setCThumbUrl] = useState('');
  const [cVideoMode, setCVideoMode] = useState<'url' | 'upload'>('url');
  const [cThumbMode, setCThumbMode] = useState<'url' | 'upload'>('url');
  const [cVideoUploading, setCVideoUploading] = useState(false);
  const [cThumbUploading, setCThumbUploading] = useState(false);
  const [cCreating, setCCreating] = useState(false);
  const [managingCourse, setManagingCourse] = useState<AdminCourse | null>(null);
  const [courseQuestions, setCourseQuestions] = useState<CourseQuestion[]>([]);
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qAdding, setQAdding] = useState(false);

  interface Announcement {
    id: string; title: string; description: string; link_url: string; is_active: boolean; created_at: string;
  }
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [aTitle, setATitle] = useState('');
  const [aDesc, setADesc] = useState('');
  const [aLink, setALink] = useState('');
  const [aAdding, setAAdding] = useState(false);
  const [clearingTournaments, setClearingTournaments] = useState(false);

  // Sub-admin management
  interface SubAdminUser { id: string; username: string; email: string; permissions: Record<string, boolean>; }
  const [subAdmins, setSubAdmins] = useState<SubAdminUser[]>([]);
  const [saEmail, setSaEmail] = useState('');
  const [saPerms, setSaPerms] = useState<Record<string, boolean>>({});
  const [saLoading, setSaLoading] = useState(false);
  const [saMsg, setSaMsg] = useState('');

  const SUB_ADMIN_PERMS = [
    { key: 'manageUsers', label: 'Manage Users' },
    { key: 'manageWithdrawals', label: 'Withdrawals' },
    { key: 'manageSettings', label: 'Settings' },
    { key: 'manageGames', label: 'Games' },
    { key: 'sendMoney', label: 'Send Money' },
    { key: 'manageTournaments', label: 'Tournaments' },
    { key: 'manageCourses', label: 'Learn Hub' },
    { key: 'manageAnnouncements', label: 'Announcements' },
  ];
  const [clearingHistory, setClearingHistory] = useState<'game' | 'transaction' | null>(null);

  interface AdminDeposit {
    id: string; username: string; email: string; amount: number; note: string; createdAt: string;
  }
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [paymentsSort, setPaymentsSort] = useState<'date' | 'amount' | 'status'>('date');
  const [paymentsSortDir, setPaymentsSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(d => {
        if (!d.isAdmin && !d.isSubAdmin) { router.replace('/dashboard'); return; }
        setCurrentUser({ isAdmin: !!d.isAdmin, isSubAdmin: !!d.isSubAdmin, permissions: d.permissions ?? {} });
        setAuthorized(true);
        const p = d.permissions ?? {};
        if (d.isAdmin || p.manageUsers) loadUsers();
        if (d.isAdmin || p.manageWithdrawals) loadWithdrawals();
        if (d.isAdmin || p.manageSettings) loadSettings();
        if (d.isAdmin || p.manageGames) loadGameStatus();
        if (d.isAdmin) loadRecallTexts();
        if (d.isAdmin || p.manageTournaments) loadTournaments();
        if (d.isAdmin || p.manageCourses) loadCourses();
        if (d.isAdmin || p.manageAnnouncements) loadAnnouncements();
        if (d.isAdmin || p.manageWithdrawals) loadDeposits();
        if (d.isAdmin) loadSubAdmins();
      })
      .catch(() => router.replace('/dashboard'));
  }, [router]);

  function loadUsers() {
    fetch('/api/admin/users').then(r => r.json()).then(d => setUsers(d.users ?? [])).catch(() => {});
  }
  function loadWithdrawals() {
    fetch('/api/admin/withdrawals').then(r => r.json()).then(d => setWithdrawals(d.withdrawals ?? [])).catch(() => {});
  }
  function loadSettings() {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      if (d.threshold !== undefined) setThreshold(String(d.threshold));
      if (d.depositInfo !== undefined) setDepositInfo(JSON.stringify(d.depositInfo, null, 2));
      if (d.leaderboardMinEarnings !== undefined) setLeaderboardMin(String(d.leaderboardMinEarnings));
      if (d.minesStartingLives !== undefined) setMinesStartingLives(d.minesStartingLives);
      if (d.memoryStartingLives !== undefined) setMemoryStartingLives(d.memoryStartingLives);
    }).catch(() => {});
  }
  function loadGameStatus() {
    fetch('/api/games/status').then(r => r.json()).then(d => {
      setGameMuted({ mines: !!d.mines?.muted, memory: !!d.memory?.muted, recall: !!d.recall?.muted });
    }).catch(() => {});
  }
  function loadRecallTexts() {
    fetch('/api/admin/recall-texts').then(r => r.json()).then(d => setRecallTexts(d.texts ?? [])).catch(() => {});
  }
  function loadTournaments() {
    fetch('/api/admin/tournaments').then(r => r.json()).then(d => setTournaments(d.tournaments ?? [])).catch(() => {});
  }
  function loadCourses() {
    fetch('/api/admin/courses').then(r => r.json()).then(d => setCourses(d.courses ?? [])).catch(() => {});
  }
  function loadDeposits() {
    fetch('/api/admin/deposits').then(r => r.json()).then(d => setDeposits(d.deposits ?? [])).catch(() => {});
  }
  function loadAnnouncements() {
    fetch('/api/admin/announcements').then(r => r.json()).then(d => setAnnouncements(d.announcements ?? [])).catch(() => {});
  }
  function loadSubAdmins() {
    fetch('/api/admin/sub-admins').then(r => r.json()).then(d => setSubAdmins(d.subAdmins ?? [])).catch(() => {});
  }
  async function uploadCourseMedia(file: File, type: 'video' | 'thumbnail'): Promise<string | null> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    const res = await fetch('/api/admin/courses/upload-media', { method: 'POST', body: fd });
    if (!res.ok) { const d = await res.json(); alert(d.error ?? 'Upload failed'); return null; }
    const d = await res.json();
    return d.url as string;
  }
  async function createCourse() {
    setCCreating(true);
    const res = await fetch('/api/admin/courses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: cTitle, description: cDesc, price: Number(cPrice), videoUrl: cVideoUrl, thumbnailUrl: cThumbUrl }),
    });
    setCCreating(false);
    if (res.ok) {
      setCTitle(''); setCDesc(''); setCPrice('0'); setCVideoUrl(''); setCThumbUrl('');
      setCVideoMode('url'); setCThumbMode('url');
      loadCourses();
    } else {
      const d = await res.json(); alert(d.error ?? 'Failed');
    }
  }
  async function saveSubAdmin(grantOrRevoke: boolean) {
    if (!saEmail.trim()) { setSaMsg('Enter an email address'); return; }
    setSaLoading(true);
    setSaMsg('');
    try {
      const res = await fetch('/api/admin/sub-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: saEmail.trim(), isSubAdmin: grantOrRevoke, permissions: grantOrRevoke ? saPerms : {} }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaMsg(grantOrRevoke ? `${data.username} is now a sub-admin` : `${data.username} sub-admin removed`);
        setSaEmail('');
        setSaPerms({});
        loadSubAdmins();
      } else {
        setSaMsg(data.error ?? 'Failed');
      }
    } catch {
      setSaMsg('Network error');
    } finally {
      setSaLoading(false);
    }
  }

  async function addAnnouncement() {
    if (!aTitle.trim()) return;
    setAAdding(true);
    const res = await fetch('/api/admin/announcements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: aTitle, description: aDesc, linkUrl: aLink }),
    });
    setAAdding(false);
    if (res.ok) { setATitle(''); setADesc(''); setALink(''); loadAnnouncements(); }
    else { const d = await res.json(); alert(d.error ?? 'Failed'); }
  }
  async function toggleAnnouncement(id: string, isActive: boolean) {
    await fetch(`/api/admin/announcements/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive }) });
    loadAnnouncements();
  }
  async function deleteAnnouncement(id: string) {
    if (!confirm('Delete this announcement?')) return;
    await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
    loadAnnouncements();
  }
  async function clearTournamentHistory(scope: 'completed' | 'all') {
    const msg = scope === 'all'
      ? 'Delete ALL tournaments (active, upcoming, and completed) and all their entries? This cannot be undone.'
      : 'Delete all COMPLETED tournaments and their entries?';
    if (!confirm(msg)) return;
    setClearingTournaments(true);
    await fetch(`/api/admin/tournaments?scope=${scope}`, { method: 'DELETE' });
    setClearingTournaments(false);
    loadTournaments();
  }
  async function toggleCourse(id: string, isActive: boolean) {
    await fetch(`/api/admin/courses/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive }) });
    loadCourses();
  }
  async function deleteCourse(id: string) {
    if (!confirm('Delete this course and all its questions/purchases? Certificates will be kept.')) return;
    await fetch(`/api/admin/courses/${id}`, { method: 'DELETE' });
    if (managingCourse?.id === id) setManagingCourse(null);
    loadCourses();
  }
  async function openManageQuestions(course: AdminCourse) {
    setManagingCourse(course);
    const res = await fetch(`/api/admin/courses/${course.id}/questions`);
    const d = await res.json();
    setCourseQuestions(d.questions ?? []);
  }
  async function addQuestion() {
    if (!managingCourse || !qText.trim() || qOptions.some(o => !o.trim())) return;
    setQAdding(true);
    const res = await fetch(`/api/admin/courses/${managingCourse.id}/questions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionText: qText, options: qOptions, correctAnswerIndex: qCorrect }),
    });
    setQAdding(false);
    if (res.ok) {
      setQText(''); setQOptions(['', '', '', '']); setQCorrect(0);
      const d2 = await fetch(`/api/admin/courses/${managingCourse.id}/questions`).then(r => r.json());
      setCourseQuestions(d2.questions ?? []);
    }
  }
  async function deleteQuestion(qid: string) {
    if (!managingCourse) return;
    await fetch(`/api/admin/courses/${managingCourse.id}/questions/${qid}`, { method: 'DELETE' });
    setCourseQuestions(p => p.filter(q => q.id !== qid));
  }
  async function uploadRecallFile(file: File, target: 'add' | 'edit' = 'add') {
    if (target === 'add') setRecallUploading(true);
    else setEditUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/recall/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (target === 'add') setRecallUploading(false);
    else setEditUploading(false);
    if (res.ok && data.text) {
      if (target === 'add') {
        const title = file.name.replace(/\.[^/.]+$/, '');
        setNewRecall(p => ({ ...p, title: p.title || title, textContent: data.text }));
      } else {
        setEditData(p => ({ ...p, textContent: data.text }));
      }
    } else {
      alert(data.error ?? 'Failed to extract text');
    }
  }

  async function sendMoney() {
    setSendLoading(true);
    setSendResult(null);
    const emails = sendEmails
      .split(/[\n,]+/)
      .map(e => e.trim())
      .filter(Boolean);
    const res = await fetch('/api/admin/send-money', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails, amount: parseFloat(sendAmount) }),
    });
    const data = await res.json();
    setSendLoading(false);
    if (res.ok) setSendResult(data);
    else alert(data.error ?? 'Failed to send money');
  }
  async function addRecallText() {
    if (!newRecall.title.trim() || !newRecall.textContent.trim()) return;
    setRecallSaving(true);
    await fetch('/api/admin/recall-texts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecall),
    });
    setRecallSaving(false);
    setShowAddRecall(false);
    setRecallUploadMode('paste');
    setNewRecall({ title: '', textContent: '', difficulty: 'Normal', disappearsAfterReading: false });
    loadRecallTexts();
  }
  async function toggleTextActive(id: string, isActive: boolean) {
    await fetch(`/api/admin/recall-texts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    });
    loadRecallTexts();
  }
  async function updateRecallText(id: string) {
    setEditSaving(true);
    await fetch(`/api/admin/recall-texts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editData.title,
        textContent: editData.textContent,
        difficulty: editData.difficulty,
        disappearsAfterReading: editData.disappearsAfterReading,
      }),
    });
    setEditSaving(false);
    setEditingId(null);
    loadRecallTexts();
  }
  async function deleteRecallText(id: string) {
    if (!confirm('Delete this text?')) return;
    await fetch(`/api/admin/recall-texts/${id}`, { method: 'DELETE' });
    if (editingId === id) setEditingId(null);
    loadRecallTexts();
  }

  async function saveStartingLives(game: 'mines' | 'memory') {
    const lives = game === 'mines' ? minesStartingLives : memoryStartingLives;
    if (!lives || lives < 1) {
      setLivesError(`${game === 'mines' ? 'Mines' : 'Memory'} starting lives must be at least 1`);
      return;
    }
    setLivesError(null);
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(game === 'mines' ? { minesStartingLives: lives } : { memoryStartingLives: lives }),
    });
    if (!res.ok) {
      const d = await res.json();
      setLivesError(d.error ?? 'Failed to save');
      return;
    }
    setLivesSaved(game);
    setTimeout(() => setLivesSaved(null), 2000);
  }
  async function clearHistory(type: 'game' | 'transaction') {
    const msg = type === 'game'
      ? 'Delete ALL game session records (mines, memory, recall)? This cannot be undone.'
      : 'Delete ALL transaction records (withdrawals and deposit logs)? This cannot be undone.';
    if (!confirm(msg)) return;
    setClearingHistory(type);
    await fetch('/api/admin/clear-history', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    setClearingHistory(null);
    if (type === 'transaction') { loadWithdrawals(); loadDeposits(); }
  }
  function exportPaymentsCSV(rows: { date: string; username: string; email: string; amount: number; type: string; status: string; note: string }[]) {
    const headers = ['Date', 'Username', 'Email', 'Amount', 'Type', 'Status', 'Note'];
    const csvRows = [headers.join(','), ...rows.map(r => [
      `"${new Date(r.date).toLocaleString()}"`,
      `"${r.username}"`,
      `"${r.email}"`,
      r.amount,
      `"${r.type}"`,
      `"${r.status}"`,
      `"${(r.note ?? '').replace(/"/g, '""')}"`,
    ].join(','))];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payments-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function toggleGame(game: string, muted: boolean) {
    setGameToggling(prev => ({ ...prev, [game]: true }));
    await fetch('/api/admin/games', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game, muted }),
    });
    setGameMuted(prev => ({ ...prev, [game]: muted }));
    setGameToggling(prev => ({ ...prev, [game]: false }));
  }

  async function adjustBalance(userId: string) {
    const val = parseFloat(balanceEdit[userId] ?? '');
    if (isNaN(val) || val < 0) return;
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balance: val }),
    });
    loadUsers();
    setBalanceEdit(prev => { const n = { ...prev }; delete n[userId]; return n; });
  }

  async function processWithdrawal(id: string, action: 'approve' | 'reject') {
    const note = noteEdit[id] ?? '';
    await fetch(`/api/admin/withdrawals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, adminNote: note || null }),
    });
    loadWithdrawals();
  }

  async function saveSettings() {
    let parsed;
    try { parsed = JSON.parse(depositInfo || '[]'); } catch { alert('Invalid JSON in deposit info'); return; }
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threshold: parseInt(threshold, 10),
        depositInfo: parsed,
        leaderboardMinEarnings: parseInt(leaderboardMin, 10) || 0,
      }),
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  }

  async function createTournament() {
    setTCreating(true);
    const startTime = tStartNow ? undefined : tStartTime;
    let dur = tDurationMinutes;
    if (tDurationCustom) {
      const n = Number(tDurationCustom);
      if (tDurationUnit === 'hours') dur = n * 60;
      else if (tDurationUnit === 'days') dur = n * 60 * 24;
      else dur = n;
    }
    const res = await fetch('/api/admin/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameType: tGameType, entryBet: Number(tEntryBet), startTime, durationMinutes: dur }),
    });
    setTCreating(false);
    if (res.ok) {
      setTEntryBet('50');
      setTStartNow(true);
      setTStartTime('');
      setTDurationMinutes(60);
      setTDurationCustom('');
      loadTournaments();
    } else {
      const d = await res.json();
      alert(d.error ?? 'Failed to create tournament');
    }
  }

  async function endTournament(id: string) {
    if (!confirm('End this tournament and calculate payouts now?')) return;
    setTEnding(id);
    const res = await fetch(`/api/admin/tournaments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end' }),
    });
    const data = await res.json();
    setTEnding(null);
    if (res.ok) {
      setTEndResult(p => ({ ...p, [id]: data }));
      loadTournaments();
    } else {
      alert(data.error ?? 'Failed to end tournament');
    }
  }

  async function resetPlatform() {
    if (resetConfirm !== 'RESET' || resetLoading) return;
    setResetLoading(true);
    setResetResult(null);
    const res = await fetch('/api/admin/reset-platform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetAdminToo }),
    });
    const data = await res.json();
    setResetLoading(false);
    if (res.ok) {
      setResetResult(data);
      setResetConfirm('');
      loadUsers();
    } else {
      alert(data.error ?? 'Reset failed');
    }
  }

  if (authorized === null) return <LoadingScreen />;

  const TABS = [
    { key: 'users' as const, label: 'Users' },
    { key: 'withdrawals' as const, label: 'Withdrawals' },
    { key: 'settings' as const, label: 'Settings' },
    { key: 'games' as const, label: 'Games' },
    { key: 'send' as const, label: 'Send Money' },
    { key: 'tournaments' as const, label: 'Tournaments' },
    { key: 'learn' as const, label: 'Learn Hub' },
    { key: 'announce' as const, label: 'Announcements' },
    ...(currentUser?.isAdmin ? [{ key: 'subadmins' as const, label: 'Sub-Admins' }] : []),
  ];

  // For sub-admins, filter tabs to only permitted ones
  const visibleTabs = currentUser?.isAdmin
    ? TABS
    : TABS.filter(t => {
        const p = currentUser?.permissions ?? {};
        const map: Record<string, string> = {
          users: 'manageUsers', withdrawals: 'manageWithdrawals', settings: 'manageSettings',
          games: 'manageGames', send: 'sendMoney', tournaments: 'manageTournaments',
          learn: 'manageCourses', announce: 'manageAnnouncements',
        };
        return p[map[t.key]];
      });

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;
  const totalBalance = users.reduce((s, u) => s + u.balance, 0);

  return (
    <div className="min-h-screen bg-black pb-28 md:pb-10 md:pt-14">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-8 md:pt-6 pb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center">
            <span className="text-black text-sm font-black">A</span>
          </div>
          <div>
            <h1 className="text-white font-black text-xl">Admin Dashboard</h1>
            <p className="text-white/30 text-xs">MoriWins Control Panel</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#111111] rounded-2xl p-4 text-center">
            <p className="text-white font-black text-2xl">{users.length}</p>
            <p className="text-white/30 text-xs mt-1 uppercase tracking-wider">Users</p>
          </div>
          <div className="bg-[#111111] rounded-2xl p-4 text-center">
            <p className="text-yellow-400 font-black text-2xl">{pendingCount}</p>
            <p className="text-white/30 text-xs mt-1 uppercase tracking-wider">Pending</p>
          </div>
          <div className="bg-[#111111] rounded-2xl p-4 text-center">
            <p className="text-green-400 font-black text-lg">${totalBalance.toLocaleString()}</p>
            <p className="text-white/30 text-xs mt-1 uppercase tracking-wider">Total Bal</p>
          </div>
        </div>

        <div className="flex border-b border-white/[0.06] mb-6 overflow-x-auto scrollbar-none">
          {visibleTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-bold tracking-wide transition-colors whitespace-nowrap ${
                tab === t.key ? 'text-white border-b-2 border-white -mb-px' : 'text-white/30 hover:text-white/60'
              }`}
            >
              {t.label}
              {t.key === 'withdrawals' && pendingCount > 0 && (
                <span className="ml-2 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <div className="space-y-3">
            {users.length === 0 && <p className="text-white/20 text-sm text-center py-8">No users yet</p>}
            {users.map(u => (
              <div key={u.id} className="bg-[#111111] rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-[#1c1c1c] flex items-center justify-center text-white font-bold text-sm">
                        {u.username[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{u.username}</p>
                        <p className="text-white/30 text-xs">{u.email}</p>
                      </div>
                      {u.isAdmin && (
                        <span className="text-[9px] bg-yellow-400/15 text-yellow-400 px-2 py-0.5 rounded-full font-bold">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-white/30 text-[10px] uppercase tracking-wider">Balance</p>
                        <p className="text-yellow-400 font-mono font-bold text-sm">${u.balance.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-white/30 text-[10px] uppercase tracking-wider">Winnings</p>
                        <p className="text-green-400 font-mono text-sm">${u.totalGameWinnings.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-white/30 text-[10px] uppercase tracking-wider">Referrals</p>
                        <p className="text-blue-400 font-mono text-sm">${u.referralEarnings.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="New balance"
                      value={balanceEdit[u.id] ?? ''}
                      onChange={e => setBalanceEdit(prev => ({ ...prev, [u.id]: e.target.value }))}
                      className="bg-[#1c1c1c] text-white text-sm font-mono rounded-xl px-3 py-2 w-28 border border-white/[0.08] focus:outline-none focus:border-white/20"
                    />
                    <button
                      onClick={() => adjustBalance(u.id)}
                      disabled={!balanceEdit[u.id]}
                      className="bg-white text-black font-bold text-xs px-4 py-2 rounded-full disabled:opacity-30"
                    >
                      Set
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'withdrawals' && (() => {
          // Build unified payment rows
          const wRows = withdrawals.map(w => ({
            id: w.id,
            date: w.createdAt,
            username: w.username,
            email: w.email,
            amount: w.amount,
            type: w.type === 'referral' ? 'Withdrawal (Referral)' : 'Withdrawal',
            status: w.status,
            note: w.adminNote ?? '',
            bankName: w.bankName,
            accountNumber: w.accountNumber,
            accountName: w.accountName,
            isWithdrawal: true,
            withdrawalId: w.id,
          }));
          const dRows = deposits.map(d => ({
            id: d.id,
            date: d.createdAt,
            username: d.username,
            email: d.email,
            amount: d.amount,
            type: 'Deposit',
            status: 'completed',
            note: d.note,
            bankName: '',
            accountNumber: '',
            accountName: '',
            isWithdrawal: false,
            withdrawalId: '',
          }));
          const allRows = [...wRows, ...dRows].sort((a, b) => {
            let cmp = 0;
            if (paymentsSort === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
            else if (paymentsSort === 'amount') cmp = a.amount - b.amount;
            else if (paymentsSort === 'status') cmp = a.status.localeCompare(b.status);
            return paymentsSortDir === 'desc' ? -cmp : cmp;
          });

          function toggleSort(col: 'date' | 'amount' | 'status') {
            if (paymentsSort === col) setPaymentsSortDir(d => d === 'asc' ? 'desc' : 'asc');
            else { setPaymentsSort(col); setPaymentsSortDir('desc'); }
          }
          const sortIcon = (col: string) => paymentsSort === col ? (paymentsSortDir === 'desc' ? ' ↓' : ' ↑') : ' ↕';

          const pendingWithdrawals = wRows.filter(r => r.status === 'pending');

          return (
            <div className="space-y-4">
              {/* Header row */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-white font-bold text-sm">{allRows.length} records</p>
                  {pendingWithdrawals.length > 0 && (
                    <p className="text-yellow-400 text-xs mt-0.5">{pendingWithdrawals.length} pending withdrawal{pendingWithdrawals.length !== 1 ? 's' : ''} need action</p>
                  )}
                </div>
                <button
                  onClick={() => exportPaymentsCSV(allRows.map(r => ({ date: r.date, username: r.username, email: r.email, amount: r.amount, type: r.type, status: r.status, note: r.note })))}
                  className="bg-green-500/20 text-green-400 border border-green-500/30 font-bold text-xs px-4 py-2 rounded-full hover:bg-green-500/30 transition-colors"
                >
                  ↓ Export CSV
                </button>
              </div>

              {allRows.length === 0 && (
                <p className="text-white/20 text-sm text-center py-12">No payment records yet</p>
              )}

              {/* Table */}
              {allRows.length > 0 && (
                <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
                  <table className="w-full text-xs border-collapse min-w-[720px]">
                    <thead>
                      <tr className="bg-[#1a1a1a] border-b border-white/[0.07]">
                        {[
                          { label: 'Date', col: 'date' as const },
                          { label: 'User', col: null },
                          { label: 'Amount', col: 'amount' as const },
                          { label: 'Type', col: null },
                          { label: 'Status', col: 'status' as const },
                          { label: 'Bank / Note', col: null },
                          { label: 'Action', col: null },
                        ].map(({ label, col }) => (
                          <th
                            key={label}
                            onClick={col ? () => toggleSort(col) : undefined}
                            className={`text-left px-4 py-3 text-white/40 font-bold tracking-wider uppercase text-[10px] whitespace-nowrap border-r border-white/[0.05] last:border-r-0 ${col ? 'cursor-pointer hover:text-white/70 select-none' : ''}`}
                          >
                            {label}{col ? sortIcon(col) : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allRows.map((row, i) => (
                        <tr key={row.id} className={`border-b border-white/[0.05] last:border-b-0 ${i % 2 === 0 ? 'bg-[#111111]' : 'bg-[#0f0f0f]'}`}>
                          <td className="px-4 py-3 text-white/40 whitespace-nowrap border-r border-white/[0.04]">
                            {new Date(row.date).toLocaleDateString()}<br />
                            <span className="text-white/20">{new Date(row.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="px-4 py-3 border-r border-white/[0.04]">
                            <p className="text-white font-bold">{row.username}</p>
                            <p className="text-white/30">{row.email}</p>
                          </td>
                          <td className="px-4 py-3 font-mono font-black border-r border-white/[0.04]">
                            <span className={row.type === 'Deposit' ? 'text-green-400' : 'text-yellow-400'}>
                              {row.type === 'Deposit' ? '+' : '-'}${row.amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 border-r border-white/[0.04]">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.type === 'Deposit' ? 'bg-green-500/15 text-green-400' :
                              row.type.includes('Referral') ? 'bg-blue-500/15 text-blue-400' :
                              'bg-yellow-400/10 text-yellow-400'
                            }`}>
                              {row.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 border-r border-white/[0.04]">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              row.status === 'approved' || row.status === 'completed' ? 'bg-green-500/15 text-green-400' :
                              row.status === 'pending' ? 'bg-yellow-400/15 text-yellow-400' :
                              'bg-red-500/15 text-red-400'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/30 border-r border-white/[0.04] max-w-[160px]">
                            {row.bankName ? (
                              <span>{row.bankName} ····{row.accountNumber.slice(-4)}<br />{row.accountName}</span>
                            ) : row.note ? (
                              <span className="italic">{row.note}</span>
                            ) : <span className="text-white/15">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {row.isWithdrawal && row.status === 'pending' ? (
                              <div className="flex flex-col gap-1.5">
                                <input
                                  placeholder="Note (opt.)"
                                  value={noteEdit[row.withdrawalId] ?? ''}
                                  onChange={e => setNoteEdit(prev => ({ ...prev, [row.withdrawalId]: e.target.value }))}
                                  className="bg-[#1c1c1c] text-white text-[10px] rounded-lg px-2 py-1 border border-white/[0.08] focus:outline-none w-28"
                                />
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => processWithdrawal(row.withdrawalId, 'approve')}
                                    className="flex-1 bg-green-500 text-black font-bold text-[10px] py-1.5 rounded-full"
                                  >
                                    ✓ OK
                                  </button>
                                  <button
                                    onClick={() => processWithdrawal(row.withdrawalId, 'reject')}
                                    className="flex-1 bg-red-500/70 text-white font-bold text-[10px] py-1.5 rounded-full"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-white/15 text-[10px]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {tab === 'settings' && (
          <div className="bg-[#111111] rounded-2xl p-6 space-y-6">
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">
                Withdrawal Threshold ($)
              </label>
              <input
                type="number"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-white font-mono text-sm w-full focus:outline-none focus:border-white/20"
              />
              <p className="text-white/20 text-xs mt-1">
                Users must have at least this balance to request a withdrawal
              </p>
            </div>
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">
                Leaderboard Minimum Earnings ($)
              </label>
              <input
                type="number"
                min="0"
                value={leaderboardMin}
                onChange={e => setLeaderboardMin(e.target.value)}
                className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-white font-mono text-sm w-full focus:outline-none focus:border-white/20"
              />
              <p className="text-white/20 text-xs mt-1">
                Only users with earnings at or above this amount appear on the leaderboard
              </p>
            </div>
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">
                Deposit Info (JSON)
              </label>
              <textarea
                value={depositInfo}
                onChange={e => setDepositInfo(e.target.value)}
                rows={6}
                placeholder='[{"method":"Bank Transfer","details":"Account: 1234567890"}]'
                className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-xs font-mono w-full focus:outline-none focus:border-white/20 resize-none"
              />
              <p className="text-white/20 text-xs mt-1">
                Array of payment method objects shown on the deposit page
              </p>
            </div>
            <button
              onClick={saveSettings}
              className={`w-full font-bold py-3.5 rounded-full text-sm transition-colors ${
                settingsSaved ? 'bg-green-500 text-black' : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              {settingsSaved ? '✓ Saved!' : 'Save Settings'}
            </button>

            {/* Danger Zone */}
            <div className="border border-red-500/25 rounded-2xl p-5 space-y-4 mt-2">
              <div>
                <p className="text-red-400 font-bold text-sm mb-1">Danger Zone</p>
              </div>

              {/* Selective clear buttons */}
              <div className="space-y-2">
                <p className="text-white/30 text-xs">Clear specific history without a full platform reset:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => clearHistory('game')}
                    disabled={clearingHistory !== null}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs py-2.5 px-3 rounded-xl hover:bg-red-500/20 transition-colors disabled:opacity-40"
                  >
                    {clearingHistory === 'game' ? 'Clearing…' : 'Clear Game History'}
                  </button>
                  <button
                    onClick={() => clearHistory('transaction')}
                    disabled={clearingHistory !== null}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs py-2.5 px-3 rounded-xl hover:bg-red-500/20 transition-colors disabled:opacity-40"
                  >
                    {clearingHistory === 'transaction' ? 'Clearing…' : 'Clear Transaction History'}
                  </button>
                </div>
                <p className="text-white/15 text-[10px]">Game history: mines, memory, recall sessions. Transaction history: all withdrawals and deposit records.</p>
              </div>

              <div className="border-t border-red-500/10 pt-4">
                <p className="text-red-400 font-bold text-xs mb-1">Full Platform Reset</p>
                <p className="text-white/30 text-xs leading-relaxed">
                  This will reset ALL user balances, game winnings, and referral earnings to zero, and clear all game history. User accounts, usernames, and passwords are NOT deleted.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetAdminToo}
                  onChange={e => setResetAdminToo(e.target.checked)}
                  className="w-4 h-4 accent-red-400"
                />
                <span className="text-white/50 text-xs">Also reset my own admin account balance</span>
              </label>

              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">
                  Type <span className="text-red-400 font-mono font-bold">RESET</span> to confirm
                </label>
                <input
                  type="text"
                  value={resetConfirm}
                  onChange={e => { setResetConfirm(e.target.value); setResetResult(null); }}
                  placeholder="RESET"
                  className="w-full bg-[#1a1a1a] border border-red-500/20 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-red-500/50 placeholder:text-white/15"
                />
              </div>

              {resetResult && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                  <p className="text-green-400 text-sm font-bold">
                    Platform reset — {resetResult.usersReset} user{resetResult.usersReset !== 1 ? 's' : ''} reset
                    {resetResult.resetAdminToo ? ' (including admin)' : ' (admin balance kept)'}
                  </p>
                </div>
              )}

              <button
                onClick={resetPlatform}
                disabled={resetConfirm !== 'RESET' || resetLoading}
                className="w-full bg-red-500 text-white font-bold py-3.5 rounded-full text-sm hover:bg-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {resetLoading ? 'Resetting...' : 'Reset Platform'}
              </button>
            </div>
          </div>
        )}

        {tab === 'games' && (
          <div className="space-y-6">
            {/* Mute toggles */}
            <div className="space-y-3">
              <p className="text-white/40 text-xs uppercase tracking-wider">Game Availability</p>
              {[
                { key: 'mines',  label: 'Mines',       Icon: Gem,    desc: 'Minesweeper · Bet-based' },
                { key: 'memory', label: 'Memory',      Icon: Layers, desc: 'Card Match · Skill-based' },
                { key: 'recall', label: 'Text Recall', Icon: Brain,  desc: 'Fill blanks · Text-based' },
              ].map(g => {
                const isMuted = gameMuted[g.key];
                const toggling = gameToggling[g.key];
                return (
                  <div key={g.key} className="bg-[#111111] rounded-2xl p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <g.Icon size={20} className="text-white/60" />
                      <div>
                        <p className="text-white font-bold text-sm">{g.label}</p>
                        <p className="text-white/30 text-xs">{g.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold ${isMuted ? 'text-red-400' : 'text-green-400'}`}>
                        {isMuted ? 'MUTED' : 'LIVE'}
                      </span>
                      <button
                        onClick={() => toggleGame(g.key, !isMuted)}
                        disabled={toggling}
                        className={`font-bold text-xs px-5 py-2 rounded-full transition-colors disabled:opacity-40 ${
                          isMuted ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-red-500/80 text-white hover:bg-red-500'
                        }`}
                      >
                        {toggling ? '...' : isMuted ? 'Unmute' : 'Mute'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Starting Lives */}
            <div className="space-y-3">
              <p className="text-white/40 text-xs uppercase tracking-wider">Starting Lives</p>
              {livesError && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{livesError}</p>
              )}
              {[
                { key: 'mines' as const, label: 'Mines', desc: 'Lives per game', value: minesStartingLives, set: setMinesStartingLives },
                { key: 'memory' as const, label: 'Memory', desc: 'Lives per round', value: memoryStartingLives, set: setMemoryStartingLives },
              ].map(g => {
                const isInvalid = !g.value || g.value < 1;
                return (
                  <div key={g.key} className="bg-[#111111] rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-white font-bold text-sm">{g.label}</p>
                      <p className="text-white/30 text-xs">{g.desc} · min 1, max 10</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={g.value}
                        onChange={e => {
                          setLivesError(null);
                          const v = parseInt(e.target.value);
                          g.set(isNaN(v) ? 1 : Math.min(10, v));
                        }}
                        className={`w-16 bg-[#1c1c1c] text-white text-sm font-mono text-center rounded-xl px-2 py-2 border focus:outline-none ${isInvalid ? 'border-red-500/60' : 'border-white/[0.08]'}`}
                      />
                      <button
                        onClick={() => saveStartingLives(g.key)}
                        disabled={isInvalid}
                        className={`font-bold text-xs px-4 py-2 rounded-full transition-colors ${
                          livesSaved === g.key ? 'bg-green-500 text-black' : 'bg-white text-black hover:bg-gray-100 disabled:opacity-30'
                        }`}
                      >
                        {livesSaved === g.key ? '✓' : 'Save'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recall Texts management */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/40 text-xs uppercase tracking-wider">Recall Texts</p>
                <button
                  onClick={() => setShowAddRecall(v => !v)}
                  className="text-xs font-bold bg-white text-black px-4 py-1.5 rounded-full hover:bg-gray-100"
                >
                  {showAddRecall ? 'Cancel' : '+ Add Text'}
                </button>
              </div>

              {/* Hidden file input for add form */}
              <input
                ref={addFileInputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadRecallFile(f); e.target.value = ''; }}
              />

              {showAddRecall && (
                <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5 mb-3 space-y-4">
                  {/* Title */}
                  <div>
                    <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Title</label>
                    <input
                      type="text"
                      value={newRecall.title}
                      onChange={e => setNewRecall(p => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. The Amazon River"
                      className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20"
                    />
                  </div>

                  {/* Content method toggle */}
                  <div>
                    <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">Text Content</label>
                    <div className="flex gap-2 mb-3">
                      {(['paste', 'upload'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setRecallUploadMode(m)}
                          className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
                            recallUploadMode === m
                              ? 'bg-white text-black'
                              : 'bg-[#1c1c1c] text-white/40 border border-white/[0.08] hover:text-white'
                          }`}
                        >
                          {m === 'paste' ? <><Pencil size={12} className="inline mr-1" />Paste</> : <><FileText size={12} className="inline mr-1" />PDF / DOCX</>}
                        </button>
                      ))}
                    </div>

                    {recallUploadMode === 'paste' ? (
                      <textarea
                        value={newRecall.textContent}
                        onChange={e => setNewRecall(p => ({ ...p, textContent: e.target.value }))}
                        rows={5}
                        placeholder="Write the passage users will read and recall..."
                        className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20 resize-none"
                      />
                    ) : (
                      <div>
                        <button
                          onClick={() => addFileInputRef.current?.click()}
                          disabled={recallUploading}
                          className="w-full border-2 border-dashed border-white/15 rounded-xl p-6 text-center hover:border-white/25 transition-colors disabled:opacity-50"
                        >
                          <div className="flex justify-center mb-2">{recallUploading ? <Loader2 size={24} className="text-white/40 animate-spin" /> : newRecall.textContent ? <Check size={24} className="text-green-400" /> : <Upload size={24} className="text-white/30" />}</div>
                          <p className="text-white/50 text-sm">
                            {recallUploading ? 'Extracting...' : newRecall.textContent ? 'Extracted — tap to replace' : 'Tap to upload PDF or DOCX'}
                          </p>
                        </button>
                        {newRecall.textContent && (
                          <p className="text-white/25 text-xs mt-2 line-clamp-2">{newRecall.textContent.slice(0, 120)}…</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Difficulty + disappears */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Difficulty</label>
                      <select
                        value={newRecall.difficulty}
                        onChange={e => setNewRecall(p => ({ ...p, difficulty: e.target.value }))}
                        className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20"
                      >
                        {['Very Simple','Simple','Normal','Complex','Difficult'].map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newRecall.disappearsAfterReading}
                          onChange={e => setNewRecall(p => ({ ...p, disappearsAfterReading: e.target.checked }))}
                          className="w-4 h-4 accent-yellow-400"
                        />
                        <span className="text-white/60 text-xs">Disappears after reading</span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={addRecallText}
                    disabled={recallSaving || recallUploading || !newRecall.title.trim() || !newRecall.textContent.trim()}
                    className="w-full bg-yellow-400 text-black font-bold text-sm py-3 rounded-full disabled:opacity-40 hover:bg-yellow-300 transition-colors"
                  >
                    {recallSaving ? 'Saving...' : 'Save Text'}
                  </button>
                </div>
              )}

              {recallTexts.length === 0 ? (
                <p className="text-white/20 text-sm text-center py-6">No recall texts yet — add one above</p>
              ) : (
                <div className="space-y-2">
                  {recallTexts.map(t => (
                    <div key={t.id} className="bg-[#111111] rounded-2xl overflow-hidden">
                      {/* Row */}
                      <div className="p-4 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-white font-bold text-sm truncate">{t.title}</p>
                            <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full">{t.difficulty}</span>
                            {t.disappears_after_reading && <span className="text-[10px] text-orange-400">vanishes</span>}
                          </div>
                          <p className="text-white/30 text-xs line-clamp-2">{t.text_content}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                          <button
                            onClick={() => toggleTextActive(t.id, !t.is_active)}
                            className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors ${
                              t.is_active ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-white/10 text-white/40 hover:bg-white/15'
                            }`}
                          >
                            {t.is_active ? 'Active' : 'Inactive'}
                          </button>
                          <button
                            onClick={() => {
                              if (editingId === t.id) { setEditingId(null); return; }
                              setEditingId(t.id);
                              setEditData({ title: t.title, textContent: t.text_content, difficulty: t.difficulty, disappearsAfterReading: t.disappears_after_reading });
                            }}
                            className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-white/10 text-white/60 hover:bg-white/15 transition-colors"
                          >
                            {editingId === t.id ? 'Cancel' : 'Edit'}
                          </button>
                          <button
                            onClick={() => deleteRecallText(t.id)}
                            className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Inline edit form */}
                      {editingId === t.id && (
                        <div className="border-t border-white/[0.06] p-4 space-y-3 bg-[#0d0d0d]">
                          <input
                            ref={editFileInputRef}
                            type="file"
                            accept=".pdf,.docx"
                            className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadRecallFile(f, 'edit'); e.target.value = ''; }}
                          />
                          <div>
                            <label className="text-white/30 text-[10px] uppercase tracking-wider block mb-1">Title</label>
                            <input
                              type="text"
                              value={editData.title}
                              onChange={e => setEditData(p => ({ ...p, title: e.target.value }))}
                              className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/20"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-white/30 text-[10px] uppercase tracking-wider">Text Content</label>
                              <button
                                onClick={() => editFileInputRef.current?.click()}
                                disabled={editUploading}
                                className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
                              >
                                {editUploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                                {editUploading ? 'Extracting...' : 'Upload PDF/DOCX'}
                              </button>
                            </div>
                            <textarea
                              value={editData.textContent}
                              onChange={e => setEditData(p => ({ ...p, textContent: e.target.value }))}
                              rows={4}
                              className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/20 resize-none"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <select
                              value={editData.difficulty}
                              onChange={e => setEditData(p => ({ ...p, difficulty: e.target.value }))}
                              className="flex-1 bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/20"
                            >
                              {['Very Simple','Simple','Normal','Complex','Difficult'].map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                            <label className="flex items-center gap-2 cursor-pointer shrink-0">
                              <input
                                type="checkbox"
                                checked={editData.disappearsAfterReading}
                                onChange={e => setEditData(p => ({ ...p, disappearsAfterReading: e.target.checked }))}
                                className="w-4 h-4 accent-yellow-400"
                              />
                              <span className="text-white/40 text-xs">Vanishes</span>
                            </label>
                          </div>
                          <button
                            onClick={() => updateRecallText(t.id)}
                            disabled={editSaving || !editData.title.trim() || !editData.textContent.trim()}
                            className="w-full bg-white text-black font-bold text-xs py-2.5 rounded-full disabled:opacity-40 hover:bg-gray-100 transition-colors"
                          >
                            {editSaving ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {tab === 'send' && (
          <div className="space-y-4">
            <div className="bg-[#111111] rounded-2xl p-6 space-y-5">
              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">
                  Email Addresses
                </label>
                <textarea
                  value={sendEmails}
                  onChange={e => setSendEmails(e.target.value)}
                  rows={5}
                  placeholder={"user@gmail.com\nother@gmail.com\nor comma-separated"}
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-white/20 resize-none placeholder:text-white/20"
                />
                <p className="text-white/20 text-xs mt-1">One per line or comma-separated. Only existing users are credited.</p>
              </div>
              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">
                  Amount to Send ($)
                </label>
                <input
                  type="number"
                  min="1"
                  value={sendAmount}
                  onChange={e => setSendAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-white/20"
                />
              </div>
              <button
                onClick={sendMoney}
                disabled={sendLoading || !sendEmails.trim() || !sendAmount || Number(sendAmount) <= 0}
                className="w-full bg-yellow-400 text-black font-bold py-4 rounded-full text-sm hover:bg-yellow-300 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {sendLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {sendLoading ? 'Sending...' : 'Send Money'}
              </button>
            </div>

            {sendResult && (
              <div className="space-y-3">
                {sendResult.credited.length > 0 && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5">
                    <p className="text-green-400 font-bold text-sm mb-3 flex items-center gap-2">
                      <Check size={16} /> {sendResult.credited.length} user{sendResult.credited.length !== 1 ? 's' : ''} credited
                    </p>
                    <div className="space-y-2">
                      {sendResult.credited.map(c => (
                        <div key={c.email} className="flex items-center justify-between">
                          <div>
                            <p className="text-white text-sm font-bold">{c.username}</p>
                            <p className="text-white/40 text-xs">{c.email}</p>
                          </div>
                          <p className="text-green-400 font-mono font-bold text-sm">+${c.amount.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {sendResult.notFound.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
                    <p className="text-red-400 font-bold text-sm mb-3 flex items-center gap-2">
                      <X size={16} /> {sendResult.notFound.length} email{sendResult.notFound.length !== 1 ? 's' : ''} not found
                    </p>
                    <div className="space-y-1">
                      {sendResult.notFound.map(e => (
                        <p key={e} className="text-white/40 text-xs font-mono">{e}</p>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => { setSendResult(null); setSendEmails(''); setSendAmount(''); }}
                  className="w-full bg-[#111111] text-white/60 font-bold py-3 rounded-full text-sm border border-white/[0.08] hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'tournaments' && (
          <div className="space-y-6">
            {/* Create form */}
            <div className="bg-[#111111] rounded-2xl p-5 space-y-4">
              <p className="text-white/40 text-xs uppercase tracking-wider">Create Tournament</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Game</label>
                  <select
                    value={tGameType}
                    onChange={e => setTGameType(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                  >
                    <option value="mines">Mines</option>
                    <option value="memory">Memory</option>
                    <option value="recall">Text Recall</option>
                  </select>
                </div>
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Entry Bet ($)</label>
                  <input
                    type="number"
                    value={tEntryBet}
                    min={1}
                    onChange={e => setTEntryBet(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">Duration</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[{ label: '15m', mins: 15 }, { label: '30m', mins: 30 }, { label: '1h', mins: 60 }, { label: '3h', mins: 180 }, { label: '6h', mins: 360 }, { label: '24h', mins: 1440 }].map(opt => (
                    <button
                      key={opt.mins}
                      onClick={() => { setTDurationMinutes(opt.mins); setTDurationCustom(''); }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${!tDurationCustom && tDurationMinutes === opt.mins ? 'bg-white text-black' : 'bg-[#1c1c1c] text-white/40 border border-white/[0.08]'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    placeholder="Custom"
                    value={tDurationCustom}
                    onChange={e => setTDurationCustom(e.target.value)}
                    className="flex-1 bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none"
                  />
                  <select
                    value={tDurationUnit}
                    onChange={e => setTDurationUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                    className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                  >
                    <option value="minutes">minutes</option>
                    <option value="hours">hours</option>
                    <option value="days">days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">Start Time</label>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setTStartNow(true)}
                    className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${tStartNow ? 'bg-white text-black' : 'bg-[#1c1c1c] text-white/40 border border-white/[0.08]'}`}
                  >
                    Start Now
                  </button>
                  <button
                    onClick={() => setTStartNow(false)}
                    className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${!tStartNow ? 'bg-white text-black' : 'bg-[#1c1c1c] text-white/40 border border-white/[0.08]'}`}
                  >
                    Schedule
                  </button>
                </div>
                {!tStartNow && (
                  <input
                    type="datetime-local"
                    value={tStartTime}
                    onChange={e => setTStartTime(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                  />
                )}
              </div>

              <button
                onClick={createTournament}
                disabled={tCreating || !tEntryBet || (!tStartNow && !tStartTime) || (!tDurationCustom && !tDurationMinutes)}
                className="w-full bg-yellow-400 text-black font-bold py-3 rounded-full text-sm hover:bg-yellow-300 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {tCreating ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}
                {tCreating ? 'Creating...' : 'Create Tournament'}
              </button>
            </div>

            {/* Tournament list */}
            {tournaments.length === 0 && (
              <p className="text-white/20 text-sm text-center py-6">No tournaments yet</p>
            )}
            <div className="space-y-3">
              {/* Clear History buttons */}
              {tournaments.some(t => t.status === 'completed') && (
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => clearTournamentHistory('completed')}
                    disabled={clearingTournaments}
                    className="flex-1 bg-red-500/15 text-red-400 hover:bg-red-500/25 font-bold text-xs py-2.5 rounded-full transition-colors disabled:opacity-40"
                  >
                    {clearingTournaments ? 'Clearing...' : 'Clear Completed History'}
                  </button>
                  <button
                    onClick={() => clearTournamentHistory('all')}
                    disabled={clearingTournaments}
                    className="bg-red-500/25 text-red-400 hover:bg-red-500/35 font-bold text-xs px-4 py-2.5 rounded-full transition-colors disabled:opacity-40"
                  >
                    Clear All
                  </button>
                </div>
              )}
              {tournaments.map(t => {
                const endRes = tEndResult[t.id];
                const statusColor = t.status === 'active' ? 'text-green-400' : t.status === 'upcoming' ? 'text-yellow-400' : 'text-white/30';
                const gameLabel: Record<string, string> = { mines: 'Mines', memory: 'Memory', recall: 'Recall' };
                return (
                  <div key={t.id} className="bg-[#111111] rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-bold text-sm">{gameLabel[t.game_type] ?? t.game_type}</p>
                          <span className={`text-[10px] font-bold uppercase ${statusColor}`}>{t.status}</span>
                        </div>
                        <div className="flex gap-4 text-xs text-white/40">
                          <span>Entry: <span className="text-white font-mono">${t.entry_bet}</span></span>
                          <span>Players: <span className="text-white font-mono">{t.entry_count}</span></span>
                          <span>Winners: <span className="text-white font-mono">{t.winner_count}</span></span>
                        </div>
                        <p className="text-white/20 text-[10px] mt-1">{new Date(t.start_time).toLocaleString()}</p>
                      </div>
                      {t.status !== 'completed' && (
                        <button
                          onClick={() => endTournament(t.id)}
                          disabled={tEnding === t.id}
                          className="bg-red-500/80 text-white font-bold text-xs px-4 py-2 rounded-full hover:bg-red-500 transition-colors disabled:opacity-40"
                        >
                          {tEnding === t.id ? 'Ending...' : 'End & Pay Out'}
                        </button>
                      )}
                    </div>
                    {endRes && (
                      <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">
                        <p className="text-green-400 text-xs font-bold">
                          Completed · {endRes.winnersCount} winner{endRes.winnersCount !== 1 ? 's' : ''} · ${endRes.distributed.toLocaleString()} distributed from ${endRes.prizePool.toLocaleString()} prize pool
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'learn' && (
          <div className="space-y-6">
            {/* Create Course */}
            <div className="bg-[#111111] rounded-2xl p-5 space-y-4">
              <p className="text-white/40 text-xs uppercase tracking-wider">Create Course</p>
              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Title</label>
                <input
                  type="text"
                  value={cTitle}
                  onChange={e => setCTitle(e.target.value)}
                  placeholder="e.g. Poker Strategy Fundamentals"
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Description</label>
                <textarea
                  value={cDesc}
                  onChange={e => setCDesc(e.target.value)}
                  rows={3}
                  placeholder="Short description of the course..."
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20 resize-none"
                />
              </div>
              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Price ($)</label>
                <input
                  type="number"
                  min={0}
                  value={cPrice}
                  onChange={e => setCPrice(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-white/20"
                />
              </div>
              {/* Video */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-white/40 text-xs uppercase tracking-wider">Video</label>
                  <div className="flex gap-1">
                    {(['url', 'upload'] as const).map(m => (
                      <button key={m} onClick={() => setCVideoMode(m)}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold transition-colors ${cVideoMode === m ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/50'}`}
                      >{m === 'url' ? 'Paste URL' : 'Upload File'}</button>
                    ))}
                  </div>
                </div>
                {cVideoMode === 'url' ? (
                  <input type="url" value={cVideoUrl} onChange={e => setCVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or direct .mp4 URL"
                    className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20" />
                ) : (
                  <div className="relative">
                    <input type="file" accept="video/mp4,video/quicktime,video/webm"
                      onChange={async e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setCVideoUploading(true);
                        const url = await uploadCourseMedia(f, 'video');
                        if (url) setCVideoUrl(url);
                        setCVideoUploading(false);
                        e.target.value = '';
                      }}
                      className="w-full text-white/50 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20"
                    />
                    {cVideoUploading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400 animate-spin" />}
                    {cVideoUrl && !cVideoUploading && <p className="text-green-400 text-xs mt-1 truncate">✓ {cVideoUrl}</p>}
                  </div>
                )}
              </div>
              {/* Thumbnail */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-white/40 text-xs uppercase tracking-wider">Thumbnail</label>
                  <div className="flex gap-1">
                    {(['url', 'upload'] as const).map(m => (
                      <button key={m} onClick={() => setCThumbMode(m)}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold transition-colors ${cThumbMode === m ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/50'}`}
                      >{m === 'url' ? 'Paste URL' : 'Upload File'}</button>
                    ))}
                  </div>
                </div>
                {cThumbMode === 'url' ? (
                  <input type="url" value={cThumbUrl} onChange={e => setCThumbUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20" />
                ) : (
                  <div className="relative">
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={async e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setCThumbUploading(true);
                        const url = await uploadCourseMedia(f, 'thumbnail');
                        if (url) setCThumbUrl(url);
                        setCThumbUploading(false);
                        e.target.value = '';
                      }}
                      className="w-full text-white/50 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20"
                    />
                    {cThumbUploading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400 animate-spin" />}
                    {cThumbUrl && !cThumbUploading && (
                      <div className="mt-2 flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cThumbUrl} alt="preview" className="w-12 h-12 rounded-lg object-cover" />
                        <p className="text-green-400 text-xs truncate">✓ Uploaded</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={createCourse}
                disabled={cCreating || !cTitle.trim()}
                className="w-full bg-yellow-400 text-black font-bold py-3 rounded-full text-sm hover:bg-yellow-300 transition-colors disabled:opacity-40"
              >
                {cCreating ? 'Creating...' : 'Create Course'}
              </button>
            </div>

            {/* Course List */}
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Courses ({courses.length})</p>
              {courses.length === 0 && (
                <p className="text-white/20 text-sm text-center py-6">No courses yet — create one above</p>
              )}
              <div className="space-y-2">
                {courses.map(course => {
                  return (
                    <div key={course.id} className="bg-[#111111] rounded-2xl overflow-hidden">
                      <div className="p-4 flex items-start gap-3">
                        {/* Thumbnail */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-[#1c1c1c] flex items-center justify-center">
                          {course.thumbnail_url ? (
                            <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white/20 text-xs">No img</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="text-white font-bold text-sm truncate">{course.title}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${course.is_active ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/30'}`}>
                              {course.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="flex gap-3 text-xs text-white/40">
                            <span>Price: <span className="text-yellow-400 font-mono">${course.price}</span></span>
                            <span>Enrolled: <span className="text-white font-mono">{course.purchase_count}</span></span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => openManageQuestions(course)}
                            className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors whitespace-nowrap"
                          >
                            Questions
                          </button>
                          <button
                            onClick={() => toggleCourse(course.id, !course.is_active)}
                            className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors ${course.is_active ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
                          >
                            {course.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => deleteCourse(course.id)}
                            className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Questions Panel */}
            {managingCourse && (
              <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider">Questions for:</p>
                    <p className="text-white font-bold text-sm mt-0.5">{managingCourse.title}</p>
                  </div>
                  <button
                    onClick={() => { setManagingCourse(null); setCourseQuestions([]); }}
                    className="text-white/40 hover:text-white text-xs font-bold px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/10 transition-colors"
                  >
                    Close
                  </button>
                </div>

                {/* Existing questions */}
                {courseQuestions.length === 0 ? (
                  <p className="text-white/20 text-xs">No questions yet</p>
                ) : (
                  <div className="space-y-3">
                    {courseQuestions.map((q, qi) => {
                      const qOpts = typeof q.options === 'string' ? JSON.parse(q.options as unknown as string) : q.options;
                      return (
                        <div key={q.id} className="bg-[#111111] rounded-xl p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-white text-sm font-bold">{qi + 1}. {q.question_text}</p>
                            <button
                              onClick={() => deleteQuestion(q.id)}
                              className="text-red-400 text-[10px] font-bold px-2 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 shrink-0"
                            >
                              Delete
                            </button>
                          </div>
                          <div className="space-y-1">
                            {(qOpts as string[]).map((opt, oi) => (
                              <p key={oi} className={`text-xs px-3 py-1.5 rounded-lg ${oi === q.correct_answer_index ? 'bg-green-500/15 text-green-400 font-bold' : 'text-white/40'}`}>
                                {['A', 'B', 'C', 'D'][oi]}. {opt}
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add question form */}
                <div className="space-y-3 border-t border-white/[0.06] pt-5">
                  <p className="text-white/40 text-xs uppercase tracking-wider">Add Question</p>
                  <div>
                    <label className="text-white/30 text-[10px] uppercase tracking-wider block mb-1">Question Text</label>
                    <textarea
                      value={qText}
                      onChange={e => setQText(e.target.value)}
                      rows={2}
                      placeholder="e.g. What is the best starting hand in poker?"
                      className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/20 resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    {(['A', 'B', 'C', 'D'] as const).map((letter, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={qCorrect === idx}
                            onChange={() => setQCorrect(idx)}
                            className="accent-green-400"
                          />
                          <span className={`text-xs font-bold w-5 ${qCorrect === idx ? 'text-green-400' : 'text-white/40'}`}>{letter}</span>
                        </label>
                        <input
                          type="text"
                          value={qOptions[idx]}
                          onChange={e => setQOptions(p => { const n = [...p]; n[idx] = e.target.value; return n; })}
                          placeholder={`Option ${letter}`}
                          className="flex-1 bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/20"
                        />
                      </div>
                    ))}
                    <p className="text-white/20 text-[10px]">Select the radio button next to the correct answer</p>
                  </div>
                  <button
                    onClick={addQuestion}
                    disabled={qAdding || !qText.trim() || qOptions.some(o => !o.trim())}
                    className="w-full bg-white text-black font-bold text-sm py-3 rounded-full disabled:opacity-40 hover:bg-gray-100 transition-colors"
                  >
                    {qAdding ? 'Adding...' : 'Add Question'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'announce' && (
          <div className="space-y-6">
            {/* Create Announcement */}
            <div className="bg-[#111111] rounded-2xl p-5 space-y-4">
              <p className="text-white/40 text-xs uppercase tracking-wider">New Announcement</p>
              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Title</label>
                <input
                  type="text"
                  value={aTitle}
                  onChange={e => setATitle(e.target.value)}
                  placeholder="e.g. New Feature: Live Tournaments"
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Description</label>
                <textarea
                  value={aDesc}
                  onChange={e => setADesc(e.target.value)}
                  rows={3}
                  placeholder="Brief description shown to users..."
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20 resize-none"
                />
              </div>
              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Link URL (optional)</label>
                <input
                  type="url"
                  value={aLink}
                  onChange={e => setALink(e.target.value)}
                  placeholder="https://... or /tournaments"
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20"
                />
              </div>
              <button
                onClick={addAnnouncement}
                disabled={aAdding || !aTitle.trim()}
                className="w-full bg-yellow-400 text-black font-bold py-3 rounded-full text-sm hover:bg-yellow-300 transition-colors disabled:opacity-40"
              >
                {aAdding ? 'Publishing...' : 'Publish Announcement'}
              </button>
            </div>

            {/* List */}
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">All Announcements ({announcements.length})</p>
              {announcements.length === 0 && (
                <p className="text-white/20 text-sm text-center py-6">No announcements yet</p>
              )}
              <div className="space-y-2">
                {announcements.map(a => (
                  <div key={a.id} className="bg-[#111111] rounded-2xl p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-white font-bold text-sm truncate">{a.title}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${a.is_active ? 'bg-green-500/20 text-green-400' : 'bg-white/8 text-white/30'}`}>
                          {a.is_active ? 'Live' : 'Hidden'}
                        </span>
                      </div>
                      {a.description && <p className="text-white/40 text-xs line-clamp-2">{a.description}</p>}
                      {a.link_url && <p className="text-blue-400/60 text-[10px] mt-0.5 truncate">{a.link_url}</p>}
                      <p className="text-white/20 text-[10px] mt-1">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => toggleAnnouncement(a.id, !a.is_active)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors ${a.is_active ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}
                      >
                        {a.is_active ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={() => deleteAnnouncement(a.id)}
                        className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-red-500/15 text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'subadmins' && (
          <div className="space-y-4">
            <div className="bg-[#111111] rounded-2xl p-5">
              <p className="text-white font-bold text-sm mb-4">Grant Sub-Admin Access</p>
              <div className="space-y-3">
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">User Email</label>
                  <input
                    type="email"
                    value={saEmail}
                    onChange={e => setSaEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-white/20"
                  />
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Permissions</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SUB_ADMIN_PERMS.map(p => (
                      <label key={p.key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!saPerms[p.key]}
                          onChange={e => setSaPerms(prev => ({ ...prev, [p.key]: e.target.checked }))}
                          className="accent-yellow-400"
                        />
                        <span className="text-white/70 text-xs">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {saMsg && (
                  <p className={`text-xs px-3 py-2 rounded-xl ${saMsg.includes('now') ? 'text-green-400 bg-green-500/10' : saMsg.includes('removed') ? 'text-yellow-400 bg-yellow-500/10' : 'text-red-400 bg-red-500/10'}`}>
                    {saMsg}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => saveSubAdmin(true)}
                    disabled={saLoading || !saEmail.trim()}
                    className="flex-1 bg-yellow-400 text-black font-bold py-2.5 rounded-full text-sm disabled:opacity-40"
                  >
                    {saLoading ? 'Saving...' : 'Grant Access'}
                  </button>
                  <button
                    onClick={() => saveSubAdmin(false)}
                    disabled={saLoading || !saEmail.trim()}
                    className="flex-1 bg-red-500/20 text-red-400 font-bold py-2.5 rounded-full text-sm disabled:opacity-40"
                  >
                    Revoke Access
                  </button>
                </div>
              </div>
            </div>

            {subAdmins.length > 0 && (
              <div className="bg-[#111111] rounded-2xl p-5">
                <p className="text-white font-bold text-sm mb-3">Current Sub-Admins ({subAdmins.length})</p>
                <div className="space-y-3">
                  {subAdmins.map(sa => (
                    <div key={sa.id} className="bg-[#1a1a1a] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-white text-sm font-bold">{sa.username}</p>
                        <button
                          onClick={async () => {
                            await fetch('/api/admin/sub-admins', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: sa.email, isSubAdmin: false, permissions: {} }),
                            });
                            loadSubAdmins();
                          }}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                        >
                          Revoke
                        </button>
                      </div>
                      <p className="text-white/30 text-xs mb-2">{sa.email}</p>
                      <div className="flex flex-wrap gap-1">
                        {SUB_ADMIN_PERMS.filter(p => sa.permissions[p.key]).map(p => (
                          <span key={p.key} className="text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full font-medium">
                            {p.label}
                          </span>
                        ))}
                        {SUB_ADMIN_PERMS.filter(p => sa.permissions[p.key]).length === 0 && (
                          <span className="text-white/20 text-[10px]">No permissions</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}
