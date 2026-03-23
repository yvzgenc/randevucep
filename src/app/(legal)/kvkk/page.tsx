import type { Metadata } from 'next'
import styles from '../legal.module.css'

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni',
  description: 'RandevuCep KVKK Aydınlatma Metni — 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında kişisel verilerinizin işlenmesine ilişkin bilgilendirme.',
}

const LAST_UPDATED = '1 Mart 2026'

export default function KvkkPage() {
  return (
    <main className={styles.content}>
      <div className={styles.pageHeader}>
        <div className={styles.badge}>KVKK</div>
        <h1 className={styles.pageTitle}>Aydınlatma Metni</h1>
        <p className={styles.pageMeta}>
          6698 Sayılı Kişisel Verilerin Korunması Kanunu Kapsamında<br />
          Son güncelleme: {LAST_UPDATED}
        </p>
      </div>

      <article className={styles.prose}>
        <p>
          Bu Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu
          (&quot;KVKK&quot;) ve ilgili mevzuat çerçevesinde, veri sorumlusu sıfatıyla
          RandevuCep tarafından hazırlanmıştır.
        </p>

        <h2>1. Veri Sorumlusunun Kimliği</h2>
        <p>
          <strong>Ticaret Unvanı:</strong> RandevuCep<br />
          <strong>İletişim:</strong> <a href="mailto:kvkk@randevucep.com">kvkk@randevucep.com</a>
        </p>

        <h2>2. İşlenen Kişisel Veriler</h2>
        <p>Hizmetimizi kullanmanız sürecinde aşağıdaki kişisel verileriniz işlenmektedir:</p>
        <ul>
          <li><strong>Kimlik Verileri:</strong> Ad, soyad</li>
          <li><strong>İletişim Verileri:</strong> E-posta adresi, telefon numarası</li>
          <li><strong>İşletme Verileri:</strong> İşletme adı, adresi, sektör bilgisi</li>
          <li><strong>İşlem Verileri:</strong> Randevu kayıtları, ödeme geçmişi</li>
          <li><strong>Teknik Veriler:</strong> IP adresi, oturum bilgileri, cihaz türü</li>
        </ul>

        <h2>3. Kişisel Verilerin İşlenme Amaçları</h2>
        <p>Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
        <ul>
          <li>Randevu hizmetinin yürütülmesi ve bildirim gönderilmesi,</li>
          <li>Üyelik ve hesap yönetiminin sağlanması,</li>
          <li>Ödeme işlemlerinin gerçekleştirilmesi,</li>
          <li>Müşteri desteği ve şikâyet yönetimi,</li>
          <li>Hizmet güvenliğinin sağlanması ve sahteciliğin önlenmesi,</li>
          <li>Yasal yükümlülüklerin yerine getirilmesi.</li>
        </ul>

        <h2>4. Kişisel Verilerin İşlenme Hukuki Dayanakları</h2>
        <p>
          Kişisel verileriniz; sözleşmenin ifası (KVKK m. 5/2-c), kanuni yükümlülükler
          (KVKK m. 5/2-ç), meşru menfaat (KVKK m. 5/2-f) ve gerektiğinde açık rıza
          (KVKK m. 5/1) hukuki sebeplerine dayanılarak işlenmektedir.
        </p>

        <h2>5. Kişisel Verilerin Aktarıldığı Taraflar</h2>
        <p>
          Kişisel verileriniz; hizmetin sunulabilmesi amacıyla aşağıdaki kategori yurt içi
          ve yurt dışı veri işleyenlerle paylaşılabilmektedir:
        </p>
        <ul>
          <li>Bulut altyapı sağlayıcıları (Supabase, Vercel),</li>
          <li>E-posta ve bildirim hizmeti sağlayıcıları (Resend),</li>
          <li>Ödeme hizmeti sağlayıcıları (iyzico),</li>
          <li>Yetkili kamu kurum ve kuruluşları (yasal zorunluluk halinde).</li>
        </ul>

        <h2>6. Kişisel Verilerin Saklanma Süreleri</h2>
        <p>
          Kişisel verileriniz, işlenme amacının gerektirdiği süre ile yasal zorunlu saklama
          sürelerinin daha uzun olanı kadar muhafaza edilmektedir. Hesap kapatma talebinde
          verileriniz 30 gün içinde anonim hale getirilir veya silinir; yasal saklama
          yükümlülükleri saklı kalmak üzere.
        </p>

        <h2>7. Veri Sahibinin Hakları (KVKK m. 11)</h2>
        <p>KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
        <ul>
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
          <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
          <li>Verilerin işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
          <li>Yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri öğrenme,</li>
          <li>Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme,</li>
          <li>Verilerin silinmesini veya yok edilmesini talep etme,</li>
          <li>Otomatik sistemlerle yapılan analize itiraz etme,</li>
          <li>Verinin kanuna aykırı işlenmesi nedeniyle uğradığınız zararın giderilmesini talep etme.</li>
        </ul>

        <h2>8. Başvuru Yöntemi</h2>
        <p>
          KVKK kapsamındaki haklarınızı kullanmak için{' '}
          <a href="mailto:kvkk@randevucep.com">kvkk@randevucep.com</a> adresine
          kimliğinizi doğrulayan belgelerle birlikte yazılı başvuruda bulunabilirsiniz.
          Başvurunuz en geç 30 gün içinde sonuçlandırılacaktır.
        </p>

        <hr className={styles.divider} />
        <p>
          Bu metin, KVKK&apos;nın 10. maddesi ve Aydınlatma Yükümlülüğünün Yerine
          Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ kapsamında hazırlanmıştır.
        </p>
      </article>
    </main>
  )
}
