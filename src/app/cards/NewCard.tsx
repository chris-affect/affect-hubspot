import {
  CrmContext,
  Divider,
  ExtensionPointApiActions,
  Flex,
  Heading,
  Link,
  Text,
  hubspot,
} from '@hubspot/ui-extensions';

interface CrmExtensionProps {
  context: CrmContext;
  actions: ExtensionPointApiActions<'crm.record.tab'>;
}

hubspot.extend<'crm.record.tab'>(({ context, actions }: CrmExtensionProps) => (
  <CrmExtension context={context} actions={actions} />
));

const CrmExtension = ({ context }: CrmExtensionProps) => {
  const portalId = context.portal.id;
  const objectId = context.crm.objectId;
  const objectTypeId = context.crm.objectTypeId;

  return (
    <Flex direction="column" gap="md">
      <Heading>Affect embedded workspace</Heading>
      <Text>
        This card is the Marketplace-facing foundation for record-level workflows
        inside HubSpot.
      </Text>

      <Divider />

      <Flex direction="column" gap="xs">
        <Text format={{ fontWeight: 'bold' }}>Current CRM context</Text>
        <Text>Portal ID: {portalId}</Text>
        <Text>Object ID: {objectId}</Text>
        <Text>Object type ID: {objectTypeId}</Text>
      </Flex>

      <Flex direction="row" gap="sm">
        <Link href="http://localhost:3000/install">Install app locally</Link>
        <Link href="https://example.com/docs">View documentation</Link>
      </Flex>
    </Flex>
  );
};
