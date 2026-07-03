import type { FilingRecord } from '@/lib/api/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BasicInfoTab } from './tabs/basic-info-tab'
import { PortEnterpriseTab } from './tabs/port-enterprise-tab'
import { ContactAuthTab } from './tabs/contact-auth-tab'
import { BusinessSignatureTab } from './tabs/business-signature-tab'
import { TemplateDiversionTab } from './tabs/template-diversion-tab'
import { AttachmentsTab } from './tabs/attachments-tab'
import { ChangeLogTab } from './tabs/change-log-tab'

interface RecordDetailProps {
  record: FilingRecord
}

export function RecordDetail({ record }: RecordDetailProps) {
  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="basic">基础信息</TabsTrigger>
        <TabsTrigger value="port-enterprise">端口企业</TabsTrigger>
        <TabsTrigger value="contact-auth">联系人授权</TabsTrigger>
        <TabsTrigger value="business-signature">业务签名</TabsTrigger>
        <TabsTrigger value="template-diversion">模板分流</TabsTrigger>
        <TabsTrigger value="attachments">附件</TabsTrigger>
        <TabsTrigger value="change-log">变更记录</TabsTrigger>
      </TabsList>
      <TabsContent value="basic"><BasicInfoTab record={record} /></TabsContent>
      <TabsContent value="port-enterprise"><PortEnterpriseTab record={record} /></TabsContent>
      <TabsContent value="contact-auth"><ContactAuthTab record={record} /></TabsContent>
      <TabsContent value="business-signature"><BusinessSignatureTab record={record} /></TabsContent>
      <TabsContent value="template-diversion"><TemplateDiversionTab record={record} /></TabsContent>
      <TabsContent value="attachments"><AttachmentsTab record={record} /></TabsContent>
      <TabsContent value="change-log"><ChangeLogTab record={record} /></TabsContent>
    </Tabs>
  )
}
