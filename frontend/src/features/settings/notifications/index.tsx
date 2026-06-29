import ContentSection from '../components/content-section'
import { NotificationsForm } from './notifications-form'

export default function SettingsNotifications() {
  return (
    <ContentSection
      title='通知'
      desc='配置您接收通知的方式。'
    >
      <NotificationsForm />
    </ContentSection>
  )
}
