import {
  AutoGrid,
  Flex,
  Heading,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  Tile,
  hubspot,
} from '@hubspot/ui-extensions';
import {
  PageBreadcrumbs,
  PageHeader,
  PageRoutes,
  PageTitle,
  createPageRouter,
} from '@hubspot/ui-extensions/pages';

const deliverySummary = [
  { label: 'Active deliveries', value: '—' },
  { label: 'Contacts in progress', value: '—' },
  { label: 'Completed this month', value: '—' },
];

const recentActivity = [
  {
    contact: 'Connect the delivery API to load activity',
    status: 'Not connected',
    updated: '—',
  },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    <PageHeader>
      <PageHeader.PrimaryAction>
        <PageHeader.PageLink to="/">Overview</PageHeader.PageLink>
      </PageHeader.PrimaryAction>
      <PageHeader.SecondaryActions>
        <PageHeader.PageLink to="/deliveries">Deliveries</PageHeader.PageLink>
        <PageHeader.PageLink to="/funnel">Funnel</PageHeader.PageLink>
      </PageHeader.SecondaryActions>
    </PageHeader>
    {children}
  </>
);

const OverviewPage = () => (
  <Flex direction="column" gap="lg">
    <PageBreadcrumbs>
      <PageBreadcrumbs.Current>Overview</PageBreadcrumbs.Current>
    </PageBreadcrumbs>
    <PageTitle>Affect delivery workspace</PageTitle>
    <Text>
      Monitor delivery activity and move contacts through Affect without leaving
      HubSpot.
    </Text>

    <AutoGrid columnWidth={240} gap="md">
      {deliverySummary.map(({ label, value }) => (
        <Tile key={label}>
          <Flex direction="column" gap="xs">
            <Text>{label}</Text>
            <Heading>{value}</Heading>
          </Flex>
        </Tile>
      ))}
    </AutoGrid>

    <Flex direction="column" gap="sm">
      <Heading>Recent activity</Heading>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Contact</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Updated</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {recentActivity.map(({ contact, status, updated }) => (
            <TableRow key={contact}>
              <TableCell>{contact}</TableCell>
              <TableCell>{status}</TableCell>
              <TableCell>{updated}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Flex>
  </Flex>
);

const DeliveriesPage = () => (
  <Flex direction="column" gap="md">
    <PageBreadcrumbs>
      <PageBreadcrumbs.PageLink to="/">Overview</PageBreadcrumbs.PageLink>
      <PageBreadcrumbs.Current>Deliveries</PageBreadcrumbs.Current>
    </PageBreadcrumbs>
    <PageTitle>Deliveries</PageTitle>
    <Text>
      This route is ready for the delivery list and API integration.
    </Text>
  </Flex>
);

const FunnelPage = () => (
  <Flex direction="column" gap="md">
    <PageBreadcrumbs>
      <PageBreadcrumbs.PageLink to="/">Overview</PageBreadcrumbs.PageLink>
      <PageBreadcrumbs.Current>Funnel</PageBreadcrumbs.Current>
    </PageBreadcrumbs>
    <PageTitle>Delivery funnel</PageTitle>
    <Text>
      The funnel is isolated on this route so it can use a native HubSpot chart or
      launch the existing visualization in an iframe modal later.
    </Text>
  </Flex>
);

const NotFoundPage = () => (
  <Flex direction="column" gap="sm">
    <PageTitle>Page not found</PageTitle>
    <Text>The requested Affect page does not exist.</Text>
  </Flex>
);

const PageRouter = createPageRouter(
  <PageRoutes layoutComponent={AppLayout}>
    <PageRoutes.IndexRoute id="overview" component={OverviewPage} />
    <PageRoutes.Route
      id="deliveries"
      path="/deliveries"
      component={DeliveriesPage}
    />
    <PageRoutes.Route id="funnel" path="/funnel" component={FunnelPage} />
    <PageRoutes.AnyRoute component={NotFoundPage} />
  </PageRoutes>,
);

hubspot.extend<'pages'>(() => <PageRouter />);
