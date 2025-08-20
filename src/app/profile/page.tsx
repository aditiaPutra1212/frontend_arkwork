'use client';

import {useEffect, useMemo, useState} from 'react';
import {useAuth} from '@/hooks/useAuth';
import {useTranslations, useLocale} from 'next-intl';

type CvFile = { name: string; data: string } | null;

export default function ProfilePage() {
  const t = useTranslations('profile');
  const locale = useLocale();
  const {user} = useAuth();

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState('');
  const [cv, setCv] = useState<CvFile>(null);

  useEffect(() => {
    if (!user) { window.location.href = '/auth/signin'; return; }
    const users = JSON.parse(localStorage.getItem('ark_users') ?? '[]');
    const u = users.find((x: any) => x.email === user.email);
    setName(u?.name ?? '');
    setLocation(u?.profile?.location ?? '');
    setPhone(u?.profile?.phone ?? '');
    setSkills(u?.profile?.skills ?? '');
    setCv(u?.profile?.cv ?? null);
  }, [user]);

  if (!user) return null;

  const tagList = useMemo(
    () => skills.split(',').map(s => s.trim()).filter(Boolean),
    [skills]
  );

  const save = () => {
    try {
      const users = JSON.parse(localStorage.getItem('ark_users') ?? '[]');
      const idx = users.findIndex((x: any) => x.email === user.email);
      if (idx >= 0) {
        users[idx].name = name;
        users[idx].profile = {location, phone, skills, cv};
        localStorage.setItem('ark_users', JSON.stringify(users));
        alert(t('toast.saved'));
      } else {
        alert(t('toast.notFound'));
      }
    } catch {
      alert(t('toast.failed'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-brand-blue">{t('title')}</h1>

        <div className="rounded-lg bg-white p-6 shadow-lg">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">{t('fields.name')}</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('ph.name')}
                className="w-full rounded-lg border px-3 py-2 focus:border-brand-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">{t('fields.email')}</label>
              <input
                readOnly
                value={user.email ?? ''}
                className="w-full rounded-lg border bg-gray-100 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">{t('fields.location')}</label>
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder={t('ph.location')}
                className="w-full rounded-lg border px-3 py-2 focus:border-brand-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">{t('fields.phone')}</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder={t('ph.phone')}
                className="w-full rounded-lg border px-3 py-2 focus:border-brand-blue focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-bold text-gray-700">{t('fields.skills')}</label>
            <textarea
              value={skills}
              onChange={e => setSkills(e.target.value)}
              rows={3}
              placeholder={t('ph.skills')}
              className="w-full rounded-lg border px-3 py-2 focus:border-brand-blue focus:outline-none"
            />
            {tagList.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tagList.map((s, i) => (
                  <span key={i} className="rounded-full bg-brand-blue px-2 py-1 text-xs text-white">
                    #{s}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-bold text-gray-700">{t('fields.cv')}</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={async e => {
                const f = e.target.files?.[0]; if (!f) return;
                const data = await f.arrayBuffer();
                const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
                const dataUrl = `data:${f.type};base64,${base64}`;
                setCv({name: f.name, data: dataUrl});
              }}
              className="w-full rounded-lg border px-3 py-2 focus:border-brand-blue focus:outline-none"
            />
            {cv && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                <i className="fa-solid fa-file" />
                <span>{cv.name}</span>
                <a href={cv.data} download={cv.name} className="text-brand-blue hover:underline">
                  {t('actions.download')}
                </a>
              </div>
            )}
          </div>

          <div className="mt-8">
            <button
              onClick={save}
              className="rounded-lg bg-brand-blue px-6 py-2 text-white hover:bg-brand-blue-light"
            >
              {t('actions.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
