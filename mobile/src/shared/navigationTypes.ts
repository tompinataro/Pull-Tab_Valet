// Central place for navigation param types to avoid import cycles
export type RootStackParamList = {
  LoginLanding: undefined;
  LoginForm: undefined;
  RouteList: { saved?: boolean; savedOffline?: boolean; devResetTS?: number } | undefined;
  VisitDetail: { id: number };
  Home: undefined;
  About: undefined;
  DeleteAccount: undefined;
  Account: undefined;
  FieldTechnicians: { mode?: 'all' } | undefined;
  ClientLocations: { mode?: 'all' } | undefined;
  ServiceRoutes: { mode?: 'all'; focusRouteId?: number } | undefined;
  AllServiceRoutes: { focusRouteId?: number } | undefined;
  AllFieldTechnicians: undefined;
  EditFieldTech: { user: any };
  ClientAssignments: { clients: any[] };
  Reports: undefined;
};
