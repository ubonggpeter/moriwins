'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trophy, ChevronLeft, Award } from 'lucide-react';
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

export default function CertificatesPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/certificates')
      .then(r => {
        if (r.status === 401) { router.replace('/auth/login'); return null; }
        return r.json();
      })
      .then(d => {
        if (d) setCertificates(d.certificates ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/30 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-28 md:pb-10 md:pt-14">
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="pt-8 md:pt-6 pb-6 flex items-center gap-3">
          <Link
            href="/learn"
            className="flex items-center gap-1 text-white/40 hover:text-white text-sm transition-colors"
          >
            <ChevronLeft size={16} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center">
              <Trophy size={20} className="text-black" />
            </div>
            <div>
              <h1 className="text-white font-black text-2xl">My Certificates</h1>
              <p className="text-white/30 text-xs">{certificates.length} certificate{certificates.length !== 1 ? 's' : ''} earned</p>
            </div>
          </div>
        </div>

        {certificates.length === 0 ? (
          <div className="text-center py-20">
            <Award size={48} className="text-white/10 mx-auto mb-4" />
            <p className="text-white/20 text-sm">No certificates yet.</p>
            <p className="text-white/10 text-xs mt-1">Complete a course and pass the test to earn one.</p>
            <Link
              href="/learn"
              className="inline-block mt-6 bg-yellow-400 text-black font-bold px-6 py-3 rounded-full text-sm hover:bg-yellow-300 transition-colors"
            >
              Browse Courses
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {certificates.map(cert => (
              <div
                key={cert.id}
                className="bg-gradient-to-br from-yellow-400/15 via-yellow-500/5 to-transparent border border-yellow-400/20 rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <Trophy size={24} className="text-yellow-400 shrink-0" />
                  <span className="text-yellow-400/60 text-[10px] font-mono font-bold tracking-widest">
                    #{cert.certificate_code}
                  </span>
                </div>
                <div>
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Certificate of Achievement</p>
                  <h2 className="text-white font-black text-base leading-tight">{cert.course_title}</h2>
                </div>
                <p className="text-white/30 text-xs">
                  Issued {new Date(cert.issued_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
                <Link
                  href={`/certificates/${cert.id}`}
                  className="block w-full text-center bg-yellow-400 text-black font-bold text-xs py-2.5 rounded-full hover:bg-yellow-300 transition-colors"
                >
                  View Certificate
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
