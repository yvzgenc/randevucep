import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, X, Hourglass } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import styles from '../payment.module.css'

export const metadata: Metadata = { title: 'Ödeme Sonucu' }

interface Props {
  searchParams: Promise<{ status?: string; plan?: string }>
}

export default async function PaymentResultPage({ searchParams }: Props) {
  const { status = 'unknown', plan } = await searchParams

  const isSuccess = status === 'success'
  const isFailed  = status === 'failure' || status === 'failed'

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {isSuccess ? (
          <>
            <div className={styles.iconSuccess}><Icon icon={Check} size="lg" /></div>
            <h1 className={styles.title}>Ödeme Başarılı!</h1>
            <p className={styles.desc}>
              {plan
                ? `${plan.charAt(0).toUpperCase() + plan.slice(1)} planınız aktifleştirildi.`
                : 'Planınız aktifleştirildi.'}
              {' '}Dashboard'unuz güncellendi.
            </p>
            <Link href="/dashboard" className={styles.btn}>
              Dashboard'a Git →
            </Link>
          </>
        ) : isFailed ? (
          <>
            <div className={styles.iconError}><Icon icon={X} size="lg" /></div>
            <h1 className={styles.title}>Ödeme Başarısız</h1>
            <p className={styles.desc}>
              Ödeme işlemi tamamlanamadı. Kart bilgilerinizi kontrol edip tekrar deneyebilirsiniz.
            </p>
            <Link href="/settings" className={styles.btn}>
              Tekrar Dene →
            </Link>
          </>
        ) : (
          <>
            <div className={styles.iconPending}><Icon icon={Hourglass} size="lg" /></div>
            <h1 className={styles.title}>Ödeme İşleniyor</h1>
            <p className={styles.desc}>
              Ödemeniz işleme alındı. İşlem tamamlandığında planınız otomatik olarak güncellenecek.
              Bu birkaç dakika sürebilir.
            </p>
            <Link href="/settings" className={styles.btn}>
              Ayarlara Dön →
            </Link>
          </>
        )}
        <p className={styles.support}>
          Sorun yaşıyorsanız{' '}
          <a href="mailto:destek@randevucep.com">destek@randevucep.com</a>{' '}
          adresinden bize yazın.
        </p>
      </div>
    </div>
  )
}
