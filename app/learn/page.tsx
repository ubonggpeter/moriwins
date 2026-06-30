'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Award } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import LoadingScreen from '@/components/LoadingScreen';

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnail_url: string;
  video_url: string;
  purchase_count: number;
}

export default function LearnPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [userPurchases, setUserPurchases] = useState<Record<string, boolean>>({});
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/courses').then(r => r.json()),
      fetch('/api/user').then(r => r.json()),
    ]).then(([coursesData, userData]) => {
      setCourses(coursesData.courses ?? []);
      setUserPurchases(coursesData.userPurchases ?? {});
      if (userData.balance !== undefined) setBalance(userData.balance);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-black pb-28 md:pb-10 md:pt-14">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="pt-8 md:pt-6 pb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center">
              <BookOpen size={20} className="text-black" />
            </div>
            <div>
              <h1 className="text-white font-black text-2xl">Learn Hub</h1>
              <p className="text-white/30 text-xs">Courses &amp; Certificates</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {balance !== null && (
              <span className="text-yellow-400 font-mono font-bold text-sm">
                ${balance.toLocaleString()}
              </span>
            )}
            <Link
              href="/certificates"
              className="flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-bold px-3 py-2 rounded-full hover:bg-yellow-400/20 transition-colors"
            >
              <Award size={14} />
              My Certs
            </Link>
          </div>
        </div>

        {/* Course grid */}
        {courses.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen size={40} className="text-white/10 mx-auto mb-4" />
            <p className="text-white/20 text-sm">No courses available yet.</p>
            <p className="text-white/10 text-xs mt-1">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {courses.map(course => {
              const purchased = !!userPurchases[course.id];
              return (
                <div
                  key={course.id}
                  className="bg-[#111111] rounded-2xl overflow-hidden cursor-pointer hover:bg-[#161616] transition-colors"
                  onClick={() => router.push(`/learn/${course.id}`)}
                >
                  {/* Thumbnail */}
                  <div className="h-40 relative overflow-hidden">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/5 flex items-center justify-center">
                        <BookOpen size={32} className="text-yellow-400/40" />
                      </div>
                    )}
                    {purchased && (
                      <div className="absolute top-2 right-2 bg-green-500 text-black text-[10px] font-black px-2 py-1 rounded-full">
                        PURCHASED
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h2 className="text-white font-bold text-sm mb-1 line-clamp-1">{course.title}</h2>
                    <p className="text-white/40 text-xs line-clamp-2 mb-3 min-h-[2rem]">{course.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400 font-mono font-bold text-sm">
                          {course.price === 0 ? 'Free' : `$${course.price.toLocaleString()}`}
                        </span>
                        {course.purchase_count > 0 && (
                          <span className="text-white/20 text-xs">{course.purchase_count} enrolled</span>
                        )}
                      </div>
                      {purchased ? (
                        <span className="text-green-400 text-xs font-bold">Owned</span>
                      ) : (
                        <span
                          className="bg-yellow-400 text-black text-xs font-bold px-3 py-1.5 rounded-full hover:bg-yellow-300 transition-colors"
                          onClick={e => { e.stopPropagation(); router.push(`/learn/${course.id}`); }}
                        >
                          Buy for ${course.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
