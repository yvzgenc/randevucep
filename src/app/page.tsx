import Link   from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { PLANS } from '@/lib/plans'
import styles from './landing.module.css'

export default async function RootPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    if (isAdminEmail(user.email)) redirect('/admin')
    const { data: biz } = await supabase
      .from('businesses')
      .select('id, onboarding_completed')
      .eq('owner_id', user.id)
      .maybeSingle()
    redirect(biz?.onboarding_completed ? '/dashboard' : '/onboarding')
  }

  return (
    <div className={styles.page}>

      {/* ── Nav ── */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoMark}>📅</div>
          <span>RandevuCep</span>
        </Link>
        <div className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>Özellikler</a>
          <a href="#pricing"  className={styles.navLink}>Fiyatlar</a>
          <Link href="/login"    className={styles.navLink}>Giriş Yap</Link>
          <Link href="/register" className={styles.navCta}>Ücretsiz Başla</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>14 gün ücretsiz · Kredi kartı gerekmez</div>
        <h1 className={styles.heroTitle}>
          Randevularınızı<br />
          <span className={styles.heroAccent}>Kolayca Yönetin</span>
        </h1>
        <p className={styles.heroSub}>
          Müşterileriniz 7/24 online rezervasyon yapsın.<br />
          Otomatik hatırlatmalar, analitikler ve daha fazlası — tek platformda.
        </p>
        <div className={styles.heroCtas}>
          <Link href="/register" className={styles.ctaPrimary}>
            14 Gün Ücretsiz Dene →
          </Link>
          <a href="#pricing" className={styles.ctaSecondary}>
            Fiyatlara Bak
          </a>
        </div>
        <p className={styles.heroNote}>
          1.200+ işletme tarafından kullanılıyor
        </p>
      </section>

      {/* ── Mock UI ── */}
      <section className={styles.mockSection}>
        <div className={styles.mockWindow}>
          <div className={styles.mockBar}>
            <span className={styles.mockDot} style={{background:'#ef4444'}} />
            <span className={styles.mockDot} style={{background:'#f59e0b'}} />
            <span className={styles.mockDot} style={{background:'#10b981'}} />
          </div>
          <div className={styles.mockContent}>
            <div className={styles.mockSidebar}>
              {['Genel Bakış','Randevular','Müşteriler','Hizmetler','Personel','Ayarlar'].map(t => (
                <div key={t} className={styles.mockSidebarItem}>{t}</div>
              ))}
            </div>
            <div className={styles.mockMain}>
              <div className={styles.mockHeader}>Genel Bakış</div>
              <div className={styles.mockStats}>
                {[
                  ['Bugünkü Randevular', '12'],
                  ['Onay Bekleyen', '3'],
                  ['Bu Ay', '148'],
                ].map(([label, val]) => (
                  <div key={label} className={styles.mockStatCard}>
                    <span className={styles.mockStatLabel}>{label}</span>
                    <span className={styles.mockStatVal}>{val}</span>
                  </div>
                ))}
              </div>
              <div className={styles.mockListTitle}>Bugünkü Randevular</div>
              {[
                ['09:00', 'Ayşe Kaya',    'Saç Kesimi',   'Onaylandı'],
                ['10:30', 'Mehmet Demir', 'Sakal Tıraşı', 'Bekliyor' ],
                ['11:00', 'Zeynep Çelik', 'Boya',         'Onaylandı'],
              ].map(([time, name, svc, status]) => (
                <div key={time} className={styles.mockRow}>
                  <span className={styles.mockTime}>{time}</span>
                  <span className={styles.mockName}>{name}</span>
                  <span className={styles.mockSvc}>{svc}</span>
                  <span className={status === 'Onaylandı' ? styles.mockBadgeOk : styles.mockBadgePending}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionLabel}>Özellikler</div>
        <h2 className={styles.sectionTitle}>İşletmeniz için ihtiyacınız olan her şey</h2>
        <p className={styles.sectionSub}>Randevu almaktan müşteri takibine kadar tüm süreçleri tek platformda yönetin.</p>
        <div className={styles.featureGrid}>
          {[
            {
              icon: '🔗',
              title: 'Online Rezervasyon',
              desc: 'Müşterileriniz size özel rezervasyon sayfanızdan 7/24 randevu alabilir. Telefon trafiğini %80 azaltın.',
            },
            {
              icon: '💬',
              title: 'Otomatik Hatırlatmalar',
              desc: 'SMS ve WhatsApp ile otomatik randevu hatırlatmaları gönderin. Kaçan randevuları minimuma indirin.',
            },
            {
              icon: '👥',
              title: 'Personel Yönetimi',
              desc: 'Personelinizin çalışma saatlerini ve hizmetlerini ayrı ayrı belirleyin. Çakışmaları önleyin.',
            },
            {
              icon: '📊',
              title: 'Analitik & Raporlar',
              desc: 'En çok tercih edilen hizmetler, personel performansı ve gelir trendlerini takip edin.',
            },
            {
              icon: '📱',
              title: 'QR Kod Paylaşımı',
              desc: 'İşletmenizin rezervasyon sayfasını QR kod ile kolayca paylaşın. Vitrine veya kartvizite ekleyin.',
            },
            {
              icon: '🔒',
              title: 'Güvenli & Hızlı',
              desc: 'Verileriniz Türkiye\'de güvenli sunucularda saklanır. KVKK uyumlu altyapı.',
            },
          ].map(f => (
            <div key={f.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{f.icon}</div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sectors ── */}
      <section className={styles.sectors}>
        <div className={styles.sectionLabel}>Sektörler</div>
        <h2 className={styles.sectionTitle}>Her sektöre uygun</h2>
        <div className={styles.sectorGrid}>
          {['💈 Kuaför & Berber','💅 Güzellik Salonu','🧘 Spa & Masaj','🐾 Veteriner','🦷 Diş Hekimi','🏋️ Fitness & Yoga','👁️ Optisyen','💊 Klinik'].map(s => (
            <div key={s} className={styles.sectorChip}>{s}</div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className={styles.pricing}>
        <div className={styles.sectionLabel}>Fiyatlar</div>
        <h2 className={styles.sectionTitle}>Basit ve şeffaf fiyatlandırma</h2>
        <p className={styles.sectionSub}>14 gün ücretsiz deneyin. İstediğinizde kolayca yükseltin.</p>
        <div className={styles.planGrid}>
          {(Object.entries(PLANS) as [string, typeof PLANS[keyof typeof PLANS]][]).map(([key, plan]) => {
            const staffLabel = plan.max_staff === -1 ? 'Sınırsız personel' : `${plan.max_staff} personel`
            const svcLabel   = plan.max_services === -1 ? 'Sınırsız hizmet' : `${plan.max_services} hizmet`
            const apptLabel  = plan.monthly_appointments === -1 ? 'Sınırsız randevu' : `Ayda ${plan.monthly_appointments} randevu`
            const extraFeatures: string[] = key === 'starter'
              ? ['Online rezervasyon sayfası', 'E-posta bildirimleri']
              : key === 'pro'
                ? ['SMS & WhatsApp bildirimleri', 'Analitik & raporlar', 'Öncelikli destek']
                : ['Çoklu şube desteği', 'Özel entegrasyon desteği', 'Özel başarı yöneticisi']

            return (
              <div
                key={key}
                className={`${styles.planCard} ${plan.highlighted ? styles.planCardHighlight : ''}`}
              >
                {plan.highlighted && <div className={styles.planBadge}>En Popüler</div>}
                <div className={styles.planName}>{plan.label}</div>
                <div className={styles.planPrice}>
                  <span className={styles.planAmount}>₺{plan.price_try}</span>
                  <span className={styles.planPeriod}>/ay</span>
                </div>
                <p className={styles.planDesc}>{plan.description}</p>
                <ul className={styles.planFeatures}>
                  <li>✓ {staffLabel}</li>
                  <li>✓ {svcLabel}</li>
                  <li>✓ {apptLabel}</li>
                  {extraFeatures.map(f => <li key={f}>✓ {f}</li>)}
                </ul>
                <Link
                  href="/register"
                  className={`${styles.planBtn} ${plan.highlighted ? styles.planBtnHighlight : ''}`}
                >
                  {plan.price_try === 0 ? 'Ücretsiz Başla' : plan.highlighted ? '14 Gün Ücretsiz Dene' : 'Başla'}
                </Link>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className={styles.ctaBanner}>
        <h2 className={styles.ctaBannerTitle}>Hemen başlayın, 14 gün ücretsiz deneyin</h2>
        <p className={styles.ctaBannerSub}>Kredi kartı gerekmez. İstediğinizde iptal edin.</p>
        <Link href="/register" className={styles.ctaPrimary}>
          Ücretsiz Hesap Aç →
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <div className={styles.logo}>
              <div className={styles.logoMark}>📅</div>
              <span>RandevuCep</span>
            </div>
            <p className={styles.footerTagline}>Her sektör için çevrimiçi randevu yönetimi.</p>
          </div>
          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <div className={styles.footerColTitle}>Ürün</div>
              <a href="#features" className={styles.footerLink}>Özellikler</a>
              <a href="#pricing"  className={styles.footerLink}>Fiyatlar</a>
              <Link href="/register" className={styles.footerLink}>Ücretsiz Başla</Link>
            </div>
            <div className={styles.footerCol}>
              <div className={styles.footerColTitle}>Yasal</div>
              <Link href="/privacy"  className={styles.footerLink}>Gizlilik Politikası</Link>
              <Link href="/terms"    className={styles.footerLink}>Kullanım Koşulları</Link>
              <Link href="/kvkk"     className={styles.footerLink}>KVKK</Link>
              <Link href="/contact"  className={styles.footerLink}>İletişim</Link>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} RandevuCep. Tüm hakları saklıdır.</span>
        </div>
      </footer>

    </div>
  )
}
