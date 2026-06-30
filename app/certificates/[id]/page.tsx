'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Printer } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  course_title: string;
  course_description: string;
  issued_at: string;
  certificate_code: string;
}

const printStyles = `
@media print {
  body > *:not(#cert-wrapper) { display: none !important; }
  #cert-wrapper { display: block !important; position: static !important; }
  .no-print { display: none !important; }
}
`;

export default function CertificatePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/certificates').then(r => {
        if (r.status === 401) { router.replace('/auth/login'); return null; }
        return r.json();
      }),
      fetch('/api/user').then(r => r.json()),
    ]).then(([certData, userData]) => {
      if (certData) {
        const found = (certData.certificates as Certificate[]).find(c => c.id === params.id);
        if (!found) { router.replace('/certificates'); return; }
        setCert(found);
      }
      if (userData.username) setUsername(userData.username);
    }).catch(() => router.replace('/certificates'))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/30 text-sm">Loading...</p>
      </div>
    );
  }

  if (!cert) return null;

  const issuedDate = new Date(cert.issued_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-black pb-28 md:pb-10 md:pt-14">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6">
        {/* Controls */}
        <div className="no-print pt-8 md:pt-6 pb-6 flex items-center justify-between">
          <Link
            href="/certificates"
            className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors"
          >
            <ChevronLeft size={16} />
            My Certificates
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-[#111111] border border-white/[0.08] text-white text-sm font-bold px-4 py-2.5 rounded-full hover:bg-white/5 transition-colors"
          >
            <Printer size={14} />
            Print / Save PDF
          </button>
        </div>

        {/* Certificate */}
        <div id="cert-wrapper">
          <div
            id="certificate-to-print"
            className="bg-white rounded-2xl p-8 sm:p-12 relative"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {/* Outer decorative border */}
            <div className="absolute inset-3 border-4 border-yellow-500 rounded-xl pointer-events-none" />
            <div className="absolute inset-5 border border-yellow-400/40 rounded-lg pointer-events-none" />

            <div className="relative z-10 text-center space-y-5">
              {/* Logo / brand */}
              <div className="space-y-1">
                <p className="text-yellow-600 text-3xl sm:text-4xl font-black tracking-widest" style={{ fontFamily: 'Georgia, serif' }}>
                  MoriWins
                </p>
                <div className="w-24 h-0.5 bg-yellow-500 mx-auto" />
              </div>

              {/* Title */}
              <div className="space-y-1">
                <p className="text-gray-500 text-xs tracking-[0.3em] uppercase">
                  Certificate of Achievement
                </p>
                <div className="w-12 h-0.5 bg-gray-300 mx-auto" />
              </div>

              {/* Body */}
              <div className="space-y-3 py-4">
                <p className="text-gray-500 text-sm italic">This certifies that</p>
                <p className="text-gray-900 text-3xl sm:text-4xl font-black" style={{ fontFamily: 'Georgia, serif' }}>
                  {username || 'Student'}
                </p>
                <p className="text-gray-500 text-sm italic">has successfully completed</p>
                <p className="text-yellow-700 text-xl sm:text-2xl font-black leading-tight">
                  {cert.course_title}
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Footer info */}
              <div className="flex items-end justify-between pt-2">
                <div className="text-left">
                  <p className="text-gray-400 text-[10px] tracking-wider uppercase">Date Issued</p>
                  <p className="text-gray-700 text-sm font-bold mt-0.5">{issuedDate}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-[10px] tracking-wider uppercase">Certificate ID</p>
                  <p className="text-yellow-600 font-mono font-bold text-sm mt-0.5">#{cert.certificate_code}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="no-print">
        <BottomNav />
      </div>
    </div>
  );
}
