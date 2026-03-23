import type { Metadata } from 'next'
import styles from '../legal.module.css'

export const metadata: Metadata = {
  title: 'Kullanım Koşulları',
  description: 'RandevuCep Kullanım Koşulları — hizmetimizi kullanırken geçerli olan kurallar ve sorumluluklar.',
}

const LAST_UPDATED = '1 Mart 2026'

export default function TermsPage() {
  return (
    <main className={styles.content}>
      <div className={styles.pageHeader}>
        <div className={styles.badge}>Hukuki</div>
        <h1 className={styles.pageTitle}>Kullanım Koşulları</h1>
        <p className={styles.pageMeta}>Son güncelleme: {LAST_UPDATED}</p>
      </div>

      <article className={styles.prose}>
        <p>
          Bu Kullanım Koşulları, randevucep.com adresinde sunulan RandevuCep hizmetlerini
          (&quot;Hizmet&quot;) kullanımınıza ilişkin yasal bir sözleşme niteliği taşımaktadır.
          Hizmetimizi kullanarak bu koşulları kabul etmiş sayılırsınız.
        </p>

        <h2>1. Hizmetin Kapsamı</h2>
        <p>
          RandevuCep; işletmelerin online randevu almasına, randevu yönetimi yapmasına,
          müşteri takibi gerçekleştirmesine ve abonelik tabanlı SaaS hizmetlerinden
          yararlanmasına olanak tanıyan bir platformdur.
        </p>

        <h2>2. Hesap Oluşturma ve Güvenlik</h2>
        <ul>
          <li>Hizmetimizi kullanmak için 18 yaşını doldurmuş olmanız gerekmektedir.</li>
          <li>Kayıt olurken doğru ve güncel bilgi vermeniz zorunludur.</li>
          <li>Hesap güvenliğinizden siz sorumlusunuz; şifrenizi kimseyle paylaşmamalısınız.</li>
          <li>Hesabınızda yetkisiz bir erişim tespit etmeniz durumunda derhal bize bildirmeniz gerekmektedir.</li>
        </ul>

        <h2>3. Kabul Edilemez Kullanım</h2>
        <p>Hizmetimizi aşağıdaki amaçlarla kullanamazsınız:</p>
        <ul>
          <li>Yasadışı faaliyetler yürütmek,</li>
          <li>Başkalarının haklarını ihlal etmek,</li>
          <li>Platformun güvenliğini tehlikeye atmak veya kötüye kullanmak,</li>
          <li>Spam veya yanıltıcı içerik yaymak,</li>
          <li>Sistemimize zarar verebilecek kötü amaçlı yazılım dağıtmak.</li>
        </ul>

        <h2>4. Abonelik ve Ödeme</h2>
        <ul>
          <li>Ücretli planlar aylık veya yıllık olarak fatura edilir.</li>
          <li>Ödemeler iyzico altyapısı üzerinden güvenli şekilde gerçekleştirilir.</li>
          <li>Deneme süresi (14 gün) sonunda ücretli plana geçilmezse hizmet kısıtlanabilir.</li>
          <li>İptal işlemleri mevcut fatura döneminin sonuna kadar geçerli olmaya devam eder; iade yapılmaz.</li>
        </ul>

        <h2>5. Fikri Mülkiyet</h2>
        <p>
          Hizmet içindeki tüm içerik, tasarım, yazılım ve marka unsurları RandevuCep&apos;e
          aittir ve Türkiye Cumhuriyeti ile uluslararası fikri mülkiyet mevzuatı kapsamında
          korunmaktadır. Kullanıcılar, kendi işletmelerine ait veriler üzerindeki haklarını
          korumaya devam eder.
        </p>

        <h2>6. Hizmet Kesintisi ve Sorumluluk Sınırlaması</h2>
        <p>
          Hizmetimizi kesintisiz sağlamak için çaba gösteririz; ancak bakım, teknik sorun
          veya mücbir sebepler nedeniyle geçici kesintiler yaşanabilir. RandevuCep, dolaylı,
          özel veya sonuçsal zararlardan sorumlu tutulamaz.
        </p>

        <h2>7. Fesih</h2>
        <p>
          Bu koşulları ihlal etmeniz durumunda hesabınızı önceden bildirimde bulunmaksızın
          askıya alma veya sonlandırma hakkımızı saklı tutarız. Hesabınızı dilediğiniz
          zaman kendiniz de kapatabilirsiniz.
        </p>

        <h2>8. Uygulanacak Hukuk</h2>
        <p>
          Bu Kullanım Koşulları Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda
          İstanbul Merkez Mahkemeleri ve İcra Müdürlükleri yetkilidir.
        </p>

        <h2>9. Değişiklikler</h2>
        <p>
          Bu koşulları zaman zaman güncelleyebiliriz. Önemli değişiklikleri en az 30 gün
          öncesinden e-posta yoluyla bildireceğiz. Değişiklik sonrası hizmeti kullanmaya
          devam etmeniz, güncel koşulları kabul ettiğiniz anlamına gelir.
        </p>

        <h2>10. İletişim</h2>
        <p>
          Kullanım koşullarına ilişkin sorularınız için{' '}
          <a href="mailto:destek@randevucep.com">destek@randevucep.com</a> adresinden
          bize ulaşabilirsiniz.
        </p>
      </article>
    </main>
  )
}
