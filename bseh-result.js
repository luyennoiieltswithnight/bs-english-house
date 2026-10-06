// bseh-result.js — gửi KẾT QUẢ CHI TIẾT của 1 bài được giao về cho giáo viên xem.
// Đặt file này ở thư mục gốc repo (cạnh index.html). Trang làm bài (Reading/Listening) gọi:
//
//   <script type="module">
//     import { saveBsehResult } from '/bseh-result.js';   // hoặc đường dẫn tương đối, vd '../../bseh-result.js'
//     // ... khi học sinh bấm "Nộp bài":
//     await saveBsehResult({
//       score: 32, total: 40, band: '7.0', timeSpentSec: 3200,
//       answers: [ { q: '1', user: 'library', correct: 'library', ok: true, by: 'Mèo' }, ... ]
//     });
//   </script>
//
// - Chỉ chạy khi trang được mở từ "Bài tập" (URL có ?assignmentId=...&uid=...). Luyện tự do thì bỏ qua.
// - Kết quả lưu 14 ngày kể từ lúc nộp, sau đó index.html tự xoá phần chi tiết.
// - `by` (không bắt buộc): nickname người điền câu đó ở chế độ "Làm chung".

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDuoosjvJe3EoF22h9UJ6M95os5s_boQ-o",
    authDomain: "b-s-english-house.firebaseapp.com",
    projectId: "b-s-english-house",
    storageBucket: "b-s-english-house.firebasestorage.app",
    messagingSenderId: "946574286636",
    appId: "1:946574286636:web:44624fb938e6b5dc961689"
};

const RESULT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export async function saveBsehResult({ score, total, band = '', timeSpentSec = 0, answers = [] } = {}) {
    const params = new URLSearchParams(location.search);
    const assignmentId = params.get('assignmentId');
    const uid = params.get('uid');
    if (!assignmentId || !uid) return false; // không phải bài được giao

    const app = getApps().find(a => a.name === 'bseh-result') || initializeApp(firebaseConfig, 'bseh-result');
    const db = getFirestore(app);
    const cleanAnswers = (answers || []).slice(0, 200).map(a => ({
        q: String(a.q ?? ''),
        user: String(a.user ?? '').slice(0, 200),
        correct: String(a.correct ?? '').slice(0, 200),
        ok: !!a.ok,
        ...(a.by ? { by: String(a.by).slice(0, 40) } : {})
    }));
    const s = Number.isFinite(score) ? score : cleanAnswers.filter(a => a.ok).length;
    const t = Number.isFinite(total) ? total : cleanAnswers.length;

    await setDoc(doc(db, 'submissions', assignmentId + '_' + uid), {
        status: 'done',
        percent: t ? Math.round(s / t * 100) : 100,
        score: s,
        completedAt: serverTimestamp(),
        result: { score: s, total: t, band, timeSpentSec, answers: cleanAnswers, submittedAt: Date.now() },
        resultExpiresAt: Date.now() + RESULT_TTL_MS
    }, { merge: true });
    return true;
}
