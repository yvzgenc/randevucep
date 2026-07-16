import type { Metadata } from 'next'
import { Mail, Lock, CreditCard, Handshake } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import styles from '../legal.module.css'

export const metadata: Metadata = {
  title: 'İletişim',
  description: 'RandevuCep destek ekibiyle iletişime geçin. Sorularınızı yanıtlamak için buradayız.',
}

export default function ContactPage() {
  return (
    <main className={styles.content}>
      <div className={styles.pageHeader}>
        <div className={styles.badge}>İletişim</div>
        <h1 className={styles.pageTitle}>Bize Ulaşın</h1>
        <p className={styles.pageMeta}>
          Sorularınızı yanıtlamak için buradayız. En geç 1 iş günü içinde dönüş yapıyoruz.
        </p>
      </div>

      {/* Contact method cards */}
      <div className={styles.contactGrid}>
        <div className={styles.contactCard}>
          <div className={styles.contactCardIcon}><Icon icon={Mail} size="xl" /></div>
          <p className={styles.contactCardTitle}>Genel Destek</p>
          <p className={styles.contactCardDesc}>
            Teknik sorular, hesap yönetimi ve platform kullanımına ilişkin konular için.
          </p>
          <a href="mailto:destek@randevucep.com" className={styles.contactCardLink}>
            destek@randevucep.com
          </a>
        </div>

        <div className={styles.contactCard}>
          <div className={styles.contactCardIcon}><Icon icon={Lock} size="xl" /></div>
          <p className={styles.contactCardTitle}>KVKK / Veri Talebi</p>
          <p className={styles.contactCardDesc}>
            Kişisel verilerinize ilişkin talepler, KVKK başvuruları ve veri silme işlemleri için.
          </p>
          <a href="mailto:kvkk@randevucep.com" className={styles.contactCardLink}>
            kvkk@randevucep.com
          </a>
        </div>

        <div className={styles.contactCard}>
          <div className={styles.contactCardIcon}><Icon icon={CreditCard} size="xl" /></div>
          <p className={styles.contactCardTitle}>Ödeme ve Fatura</p>
          <p className={styles.contactCardDesc}>
            Abonelik, fatura ve ödeme işlemlerine ilişkin destek için.
          </p>
          <a href="mailto:fatura@randevucep.com" className={styles.contactCardLink}>
            fatura@randevucep.com
          </a>
        </div>

        <div className={styles.contactCard}>
          <div className={styles.contactCardIcon}><Icon icon={Handshake} size="xl" /></div>
          <p className={styles.contactCardTitle}>İş Birliği</p>
          <p className={styles.contactCardDesc}>
            Kurumsal kullanım, entegrasyon ve iş ortaklığı konularında görüşmek için.
          </p>
          <a href="mailto:partner@randevucep.com" className={styles.contactCardLink}>
            partner@randevucep.com
          </a>
        </div>
      </div>

      {/* Support details */}
      <article className={styles.prose}>
        <h2>Destek Saatleri</h2>
        <p>
          Destek ekibimiz <strong>Pazartesi – Cuma, 09:00 – 18:00 (Türkiye saati)</strong> arasında
          aktiftir. Hafta sonu veya tatil günlerine gelen mesajlarınız bir sonraki iş günü
          yanıtlanır.
        </p>

        <h2>Cevap Süresi</h2>
        <ul>
          <li><strong>Genel destek talepleri:</strong> En geç 1 iş günü</li>
          <li><strong>Teknik acil durumlar:</strong> En geç 4 saat (iş saatleri içinde)</li>
          <li><strong>KVKK başvuruları:</strong> En geç 30 gün (yasal süre)</li>
        </ul>

        <h2>Sık Sorulan Sorular</h2>
        <p>
          Sorunuzun cevabını hızlıca bulmak için{' '}
          <a href="/#faq">SSS bölümümüzü</a> inceleyebilirsiniz.
        </p>

        <h2>Hesabınıza Giriş Yapın</h2>
        <p>
          Mevcut bir hesabınız varsa{' '}
          <a href="/login">giriş yaparak</a> hesap ayarlarınızı yönetebilir,
          aboneliğinizi değiştirebilir veya destek talebi oluşturabilirsiniz.
        </p>
      </article>
    </main>
  )
}
