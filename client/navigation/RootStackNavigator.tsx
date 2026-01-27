import React from 'react';
import { Pressable, ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import PhotoGroupScreen from '@/screens/PhotoGroupScreen';


import { useScreenOptions } from '@/hooks/useScreenOptions';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { Colors } from '@/constants/theme';

import LoginScreen from '@/screens/LoginScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import AttendanceMenuScreen from '@/screens/AttendanceMenuScreen';
import AddEmployeeScreen from '@/screens/AddEmployeeScreen';
import ManualAttendanceScreen from '@/screens/ManualAttendanceScreen';
import FaceScanScreen from '@/screens/FaceScanScreen';
import FingerprintAttendanceScreen from '@/screens/FingerprintAttendanceScreen';
import AttendanceSheetScreen from '@/screens/AttendanceSheetScreen';
import EmployeeListScreen from '@/screens/EmployeeListScreen';
import ClientListScreen from '@/screens/ClientListScreen';
import ClientDetailScreen from '@/screens/ClientDetailScreen';
import MaterialInventoryScreen from '@/screens/MaterialInventoryScreen';
import MaterialOrderShopScreen from '../screens/MaterialOrderShopScreen';
import VendorListScreen from '@/screens/VendorListScreen';
import VendorDetailScreen from '@/screens/VendorDetailScreen';
import PhotoSectionScreen from '@/screens/PhotoSectionScreen';
import LookAheadScreen from '@/screens/LookAheadScreen';
import SimpleTestScreen from '@/screens/SimpleTestScreen';
import AttendanceHistoryScreen from '@/screens/AttendanceHistory';
import ManagementScreen from '@/screens/ManagementScreen';
import AccountManagementScreen from "@/screens/AccountManagementScreen";
import SubContractorListScreen from '@/screens/SubContractorListScreen';
import SubContractorDetailScreen from '@/screens/SubContractorDetailScreen';
import TransportListScreen from '@/screens/TransportListScreen';  // Add this
import TransportDetailScreen from '@/screens/TransportDetailScreen';
import RequestManagementScreen from '@/screens/RequestManagementScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  AttendanceMenu: undefined;
  AddEmployee: undefined;
  ManualAttendance: undefined;
  FaceScan: undefined;
  FingerprintAttendance: undefined;
  AttendanceSheet: undefined;
  AttendanceHistory: undefined;
  LookAhead: undefined;
  EmployeeList: undefined;
  ClientList: undefined;
  ClientDetail: { clientId: string };
  MaterialInventory: undefined;
  MaterialOrderShop: undefined;
  VendorList: undefined;
  VendorDetail: { vendorId: string };
  Photo: undefined;

  // ✅ ADD THIS
  PhotoGroup: { groupId: string };

  SimpleTest: undefined;
  Management: undefined;
  AccountManagement: undefined;
  RequestManagement: undefined;
  SubContractorList: undefined;
  SubContractorDetail: { subContractorId: string };
  TransportList: undefined;
  TransportDetail: { transportId: string };
  Notifications: undefined;
};


const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const opaqueScreenOptions = useScreenOptions({ transparent: false });
  const { user, isLoading, logout } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
<Stack.Navigator
  screenOptions={screenOptions}
  initialRouteName={user ? 'Dashboard' : 'Login'}
>

      <Stack.Screen
  name="PhotoGroup"
  component={PhotoGroupScreen}
  options={{ headerTitle: 'Photos' }}
/>

      {user ? (
        <>
        <Stack.Screen
  name="Dashboard"
  component={DashboardScreen}
  options={({ navigation }) => ({
    headerTitle: 'Dashboard',
    headerRight: () => (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Bell Icon */}
        <Pressable
          onPress={() => navigation.navigate('Notifications')}
          hitSlop={8}
          style={{ marginRight: 16 }}
        >
          <Feather name="bell" size={22} color={theme.text} />
        </Pressable>

        {/* Logout Icon */}
        <Pressable onPress={logout} hitSlop={8}>
          <Feather name="log-out" size={22} color={theme.text} />
        </Pressable>
      </View>
    ),
  })}
/>

          
 <Stack.Screen
    name="Notifications"
    component={NotificationsScreen}
    options={{ headerTitle: 'Notifications' }}
  />
          <Stack.Screen
            name="AttendanceMenu"
            component={AttendanceMenuScreen}
            options={{ ...opaqueScreenOptions, headerTitle: 'Attendance' }}
          />
          <Stack.Screen
            name="AddEmployee"
            component={AddEmployeeScreen}
            options={{ ...opaqueScreenOptions, headerTitle: 'Add Employee' }}
          />
          <Stack.Screen
            name="ManualAttendance"
            component={ManualAttendanceScreen}
            options={{ ...opaqueScreenOptions, headerTitle: 'Manual Entry' }}
          />
          <Stack.Screen
  name="ManagementScreen"
  component={ManagementScreen}
/>

          <Stack.Screen
            name="FaceScan"
            component={FaceScanScreen}
            options={{ headerTitle: 'Face Scan', headerShown: false }}
          />
          <Stack.Screen
            name="FingerprintAttendance"
            component={FingerprintAttendanceScreen}
            options={{ ...opaqueScreenOptions, headerTitle: 'Fingerprint Attendance' }}
          />
          <Stack.Screen
            name="AttendanceSheet"
            component={AttendanceSheetScreen}
            options={{ ...opaqueScreenOptions, headerTitle: 'Attendance Sheet' }}
          />
           <Stack.Screen
              name="RequestManagement"
              component={RequestManagementScreen}
              options={{ title: 'Request Management' }}
            />
          <Stack.Screen
            name="AttendanceHistory"
            component={AttendanceHistoryScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="LookAhead"
            component={LookAheadScreen}
            options={{ headerTitle: 'Look Ahead' }}
          />
          <Stack.Screen
            name="EmployeeList"
            component={EmployeeListScreen}
            options={{ ...opaqueScreenOptions, headerTitle: 'Employees' }}
          />
          <Stack.Screen
            name="ClientList"
            component={ClientListScreen}
            options={{ ...opaqueScreenOptions, headerTitle: 'Clients' }}
          />
          <Stack.Screen
            name="ClientDetail"
            component={ClientDetailScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="MaterialInventory"
            component={MaterialInventoryScreen}
            options={{ ...opaqueScreenOptions, headerTitle: 'Material Inventory' }}
          />
          <Stack.Screen
            name="MaterialOrderShop"
            component={MaterialOrderShopScreen}
            options={{ ...opaqueScreenOptions, headerTitle: "Order Materials" }}
          />
          <Stack.Screen
            name="VendorList"
            component={VendorListScreen}
            options={{ ...opaqueScreenOptions, headerTitle: 'Vendors' }}
          />
          <Stack.Screen
            name="VendorDetail"
            component={VendorDetailScreen}
            options={{ ...opaqueScreenOptions, headerTitle: 'Vendor Details' }}
          />
          <Stack.Screen
  name="SubContractorList"
  component={SubContractorListScreen}
  options={{ ...opaqueScreenOptions, headerTitle: 'Sub Contractors' }}
/>

<Stack.Screen
  name="SubContractorDetail"
  component={SubContractorDetailScreen}
  options={{ ...opaqueScreenOptions, headerTitle: 'Sub Contractor Details' }}
/>
<Stack.Screen
  name="TransportList"
  component={TransportListScreen}
  options={{ ...opaqueScreenOptions, headerTitle: 'Transport' }}
/>

<Stack.Screen
  name="TransportDetail"
  component={TransportDetailScreen}
  options={{ ...opaqueScreenOptions, headerTitle: 'Transport Details' }}
/>
          <Stack.Screen
            name="Photo"
            component={PhotoSectionScreen}
            options={{ ...opaqueScreenOptions, headerTitle: 'Photo Section' }}
          />
          <Stack.Screen
            name="SimpleTest"
            component={SimpleTestScreen}
            options={{ ...opaqueScreenOptions, headerTitle: 'Simple Test' }}
          />
          <Stack.Screen
            name="Management"
            component={ManagementScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AccountManagement"
            component={AccountManagementScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});