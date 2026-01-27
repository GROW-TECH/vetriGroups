import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { UserRole } from '@/types';
import { Spacing, BorderRadius, Colors } from '@/constants/theme';

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface RoleCardProps {
  role: UserRole;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  onPress: () => void;
}

function RoleCard({ role, label, icon, color, onPress }: RoleCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.95, springConfig); }}
      onPressOut={() => { scale.value = withSpring(1, springConfig); }}
      style={[styles.roleCard, animatedStyle]}
    >
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
<Feather name={icon} size={20} color="#FFFFFF" />
      </View>
      <ThemedText type="small" style={styles.roleLabel} lightColor="#FFFFFF" darkColor="#FFFFFF">
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { loginWithCredentials } = useAuth();
const { clients, employees, vendors } = useData();
const [loginMode, setLoginMode] = React.useState<
  | 'role-select'
  | 'client-login'
  | 'engineer-login'
  | 'site-engineer-login'
  | 'vendor-login'
>('role-select');

  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const handleRoleSelect = async (role: UserRole) => {
  setError(null);

  // ADMIN → fixed login
  if (role === 'admin') {
    await loginWithCredentials('admin', 'admin@123', 'admin');
    return;
  }

  if (role === 'client') {
    setLoginMode('client-login');
    return;
  }

  if (role === 'engineer') {
    setLoginMode('engineer-login');
    return;
  }

  if (role === 'site-engineer') {
    setLoginMode('site-engineer-login');
    return;
  }

  if (role === 'vendor') {
    setLoginMode('vendor-login');
    return;
  }
};

const handleSiteEngineerLogin = async () => {
  if (!username.trim()) {
    setError('Please enter your username');
    return;
  }
  if (!password.trim()) {
    setError('Please enter your password');
    return;
  }

  setIsLoggingIn(true);
  setError(null);

  try {
    const siteEngineer = employees.find(
      emp =>
        emp.username?.toLowerCase() === username.trim().toLowerCase() &&
        emp.role === 'site-engineer'   // ✅ FIXED LINE
    );

    if (!siteEngineer) {
      setError('Site Engineer not found');
      return;
    }

    if (siteEngineer.password !== password) {
      setError('Incorrect password');
      return;
    }

    await loginWithCredentials(
      siteEngineer.username!,
      siteEngineer.password!,
      'site-engineer',
      {
        employeeId: siteEngineer.id,
        employeeName: siteEngineer.name,
      }
    );
  } catch (err: any) {
    setError(err.message || 'Login failed');
  } finally {
    setIsLoggingIn(false);
  }
};



  const handleDefaultLogin = async (role: UserRole) => {
    const defaultCredentials: Record<UserRole, { username: string; password: string }> = {
      admin: { username: 'admin', password: 'admin123' },
      engineer: { username: 'engineer', password: 'engineer123' },
      client: { username: 'client', password: 'client123' },
      vendor: { username: 'vendor', password: 'vendor123' },
    };

    try {
      setIsLoggingIn(true);
      setError(null);
      const credentials = defaultCredentials[role];
      console.log(`[LoginScreen] Logging in as ${role} with default credentials`);
      if (credentials) {
        await loginWithCredentials(credentials.username, credentials.password, role);
      }
    } catch (err: any) {
      console.error('[LoginScreen] Login error:', err);
      setError(err?.message || 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleClientLogin = async () => {
  console.log('[LoginScreen] Client login attempt:', { username, password });
  
  if (!username.trim()) {
    setError('Please enter your username');
    return;
  }
  if (!password.trim()) {
    setError('Please enter your password');
    return;
  }

  setIsLoggingIn(true);
  setError(null);

  try {
    // Find client by username (case-insensitive)
    const client = clients.find(
      client => client.username?.toLowerCase() === username.trim().toLowerCase()
    );

    if (!client) {
      setError('Client not found. Please check your username.');
      setIsLoggingIn(false);
      return;
    }

    if (!client.password) {
      setError('No password set for this client. Please contact admin.');
      setIsLoggingIn(false);
      return;
    }

    if (client.password !== password) {
      setError('Incorrect password. Please try again.');
      setIsLoggingIn(false);
      return;
    }

    // Login successful - PASS clientId in additionalData
    console.log('[LoginScreen] Client login successful, clientId:', client.id);
    await loginWithCredentials(
      client.username || username, 
      client.password, 
      'client', 
      {
        clientId: client.id,           // ✅ CRITICAL: This ensures clientId is available
        clientName: client.name,
        projectName: client.projectName,
        email: client.email,
      }
    );
    
  } catch (err: any) {
    console.error('[LoginScreen] Client login error:', err);
    setError(err?.message || 'Login failed. Please try again.');
  } finally {
    setIsLoggingIn(false);
  }
};

  const handleEngineerLogin = async () => {
    console.log('[LoginScreen] Engineer login attempt:', { username, password });
    
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsLoggingIn(true);
    setError(null);

    try {
      // Find engineer/employee by username (case-insensitive)
      // First check in employees with engineer role
      const engineer = employees.find(
        emp => emp.username?.toLowerCase() === username.trim().toLowerCase() && 
emp.role === 'engineer'
      );

      console.log('[LoginScreen] Found engineer:', engineer);
      console.log('[LoginScreen] All employees:', employees);

      if (!engineer) {
        setError('Engineer not found. Please check your username or contact admin.');
        setIsLoggingIn(false);
        return;
      }

      if (!engineer.password) {
        setError('No password set for this engineer. Please contact admin.');
        setIsLoggingIn(false);
        return;
      }

      if (engineer.password !== password) {
        setError('Incorrect password. Please try again.');
        setIsLoggingIn(false);
        return;
      }

      // Login successful
      await loginWithCredentials(engineer.username || username, engineer.password, 'engineer', {
        employeeId: engineer.id,
        employeeName: engineer.name,
        role: engineer.role,
        canViewData: true, // Engineer can view data
      });
      
    } catch (err: any) {
      console.error('[LoginScreen] Engineer login error:', err);
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };


 const handleVendorLogin = async () => {
  console.log('[LoginScreen] Vendor login attempt:', { username, password });
  
  if (!username.trim()) {
    setError('Please enter your username');
    return;
  }
  if (!password.trim()) {
    setError('Please enter your password');
    return;
  }

  setIsLoggingIn(true);
  setError(null);

  try {
    // Find vendor by name (case-insensitive)
 const vendor = vendors.find(
  v => v.username?.toLowerCase() === username.trim().toLowerCase()
);

    console.log('[LoginScreen] Found vendor:', vendor);
    console.log('[LoginScreen] All vendors:', vendors);

    if (!vendor) {
      setError('Vendor not found. Please check your username or contact admin.');
      setIsLoggingIn(false);
      return;
    }

    if (!vendor.password) {
      setError('No password set for this vendor. Please contact admin.');
      setIsLoggingIn(false);
      return;
    }

    if (vendor.password !== password) {
      setError('Incorrect password. Please try again.');
      setIsLoggingIn(false);
      return;
    }

    // Login successful
    await loginWithCredentials(vendor.name || username, vendor.password, 'vendor', {
      vendorId: vendor.id,
      vendorName: vendor.name,
      gstNumber: vendor.gstNumber,
      phone: vendor.phone,
      canViewData: true,
    });
    
  } catch (err: any) {
    console.error('[LoginScreen] Vendor login error:', err);
    setError(err?.message || 'Login failed. Please try again.');
  } finally {
    setIsLoggingIn(false);
  }
};
  const handleBackToRoleSelect = () => {
    setLoginMode('role-select');
    setUsername('');
    setPassword('');
    setError(null);
  };

  // Get engineers from employees data
const engineers = React.useMemo(() => {
  return employees.filter(
    emp =>
      (emp.role === 'engineer' || emp.role === 'site-engineer') &&
      emp.username &&
      emp.password
  );
}, [employees]);
;

  // Get clients with login credentials
  const clientsWithLogin = React.useMemo(() => {
    return clients.filter(client => client.username && client.password);
  }, [clients]);
// Get vendors with login credentials
const vendorsWithLogin = React.useMemo(() => {
  return vendors.filter(vendor => vendor.name && vendor.password);
}, [vendors]);
 const getLoginFormTitle = () => {
  switch (loginMode) {
    case 'client-login': return 'Client Login';
    case 'engineer-login': return 'Engineer Login';
    case 'site-engineer-login': return 'Site Engineer Login';
    case 'vendor-login': return 'Vendor Login';
    default: return 'Login';
  }
};


 const getLoginFormSubtitle = () => {
  switch (loginMode) {
    case 'client-login':
      return 'Enter your credentials to access project details';
    case 'engineer-login':
      return 'Enter your credentials to access project data';
    case 'site-engineer-login':
      return 'Enter your credentials to mark and view attendance';
    case 'vendor-login':
      return 'Enter your credentials to access vendor portal';
    default:
      return '';
  }
};

const handleLogin = () => {
  switch (loginMode) {
    case 'client-login':
      return handleClientLogin();
    case 'engineer-login':
      return handleEngineerLogin();
    case 'site-engineer-login':
      return handleSiteEngineerLogin();
    case 'vendor-login':
      return handleVendorLogin();
  }
};



  

  const renderLoginForm = () => (
    <View style={styles.form}>
      <Pressable onPress={handleBackToRoleSelect} style={styles.backButton}>
        <Feather name="arrow-left" size={20} color="#FFFFFF" />
        <ThemedText type="small" style={styles.backText} lightColor="#FFFFFF" darkColor="#FFFFFF">
          Back to role selection
        </ThemedText>
      </Pressable>

      <ThemedText type="small" style={styles.label} lightColor="#FFFFFF" darkColor="#FFFFFF">
        Username
      </ThemedText>
      <TextInput
        value={username}
        onChangeText={(text) => {
          setUsername(text);
          setError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Enter your username"
        placeholderTextColor="rgba(255,255,255,0.5)"
        style={styles.input}
      />

      <ThemedText type="small" style={styles.label} lightColor="#FFFFFF" darkColor="#FFFFFF">
        Password
      </ThemedText>
      <TextInput
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setError(null);
        }}
        secureTextEntry
        placeholder="Enter your password"
        placeholderTextColor="rgba(255,255,255,0.5)"
        style={styles.input}
      />

      {error ? (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={16} color="#FCA5A5" />
          <ThemedText type="small" style={styles.error} lightColor="#FCA5A5" darkColor="#FCA5A5">
            {error}
          </ThemedText>
        </View>
      ) : null}

      <Pressable
        style={[styles.loginButton, isLoggingIn && styles.loginButtonDisabled]}
        onPress={handleLogin}
        disabled={isLoggingIn}
      >
        <ThemedText type="body" style={styles.loginButtonText} lightColor="#1E3A5F" darkColor="#1E3A5F">
          {isLoggingIn ? 'Logging in...' : 'Login'}
        </ThemedText>
      </Pressable>

      {/* Show available users for each role */}
      {loginMode === 'engineer-login' && engineers.length > 0 && (
        <View style={styles.usersList}>
          <ThemedText type="small" style={styles.usersListTitle} lightColor="rgba(255,255,255,0.7)" darkColor="rgba(255,255,255,0.7)">
            Available Engineers ({engineers.length}):
          </ThemedText>
          {engineers.slice(0, 5).map((engineer) => (
            <View key={engineer.id} style={styles.userItem}>
              <Feather name="user" size={14} color="rgba(255,255,255,0.6)" />
              <View style={styles.userInfo}>
                <ThemedText type="small" style={styles.userName} lightColor="rgba(255,255,255,0.6)" darkColor="rgba(255,255,255,0.6)">
                  {engineer.name}
                </ThemedText>
                <ThemedText type="small" style={styles.userDetails} lightColor="rgba(255,255,255,0.5)" darkColor="rgba(255,255,255,0.5)">
                  Username: {engineer.username} • Role: {engineer.role}
                </ThemedText>
              </View>
            </View>
          ))}
          {engineers.length > 5 && (
            <ThemedText type="small" style={styles.userMore} lightColor="rgba(255,255,255,0.5)" darkColor="rgba(255,255,255,0.5)">
              +{engineers.length - 5} more
            </ThemedText>
          )}
        </View>
      )}

      {loginMode === 'client-login' && clientsWithLogin.length > 0 && (
        <View style={styles.usersList}>
          <ThemedText type="small" style={styles.usersListTitle} lightColor="rgba(255,255,255,0.7)" darkColor="rgba(255,255,255,0.7)">
            Registered Clients ({clientsWithLogin.length}):
          </ThemedText>
          {clientsWithLogin.slice(0, 5).map((client) => (
            <View key={client.id} style={styles.userItem}>
              <Feather name="user" size={14} color="rgba(255,255,255,0.6)" />
              <View style={styles.userInfo}>
                <ThemedText type="small" style={styles.userName} lightColor="rgba(255,255,255,0.6)" darkColor="rgba(255,255,255,0.6)">
                  {client.name}
                </ThemedText>
                <ThemedText type="small" style={styles.userDetails} lightColor="rgba(255,255,255,0.5)" darkColor="rgba(255,255,255,0.5)">
                  {client.projectName} • Username: {client.username}
                </ThemedText>
              </View>
            </View>
          ))}
          {clientsWithLogin.length > 5 && (
            <ThemedText type="small" style={styles.userMore} lightColor="rgba(255,255,255,0.5)" darkColor="rgba(255,255,255,0.5)">
              +{clientsWithLogin.length - 5} more
            </ThemedText>
          )}
        </View>
      )}

   {loginMode === 'vendor-login' && vendorsWithLogin.length > 0 && (
  <View style={styles.usersList}>
    <ThemedText type="small" style={styles.usersListTitle} lightColor="rgba(255,255,255,0.7)" darkColor="rgba(255,255,255,0.7)">
      Registered Vendors ({vendorsWithLogin.length}):
    </ThemedText>
    {vendorsWithLogin.slice(0, 5).map((vendor) => (
      <View key={vendor.id} style={styles.userItem}>
        <Feather name="package" size={14} color="rgba(255,255,255,0.6)" />
        <View style={styles.userInfo}>
          <ThemedText type="small" style={styles.userName} lightColor="rgba(255,255,255,0.6)" darkColor="rgba(255,255,255,0.6)">
            {vendor.name}
          </ThemedText>
          <ThemedText type="small" style={styles.userDetails} lightColor="rgba(255,255,255,0.5)" darkColor="rgba(255,255,255,0.5)">
            GST: {vendor.gstNumber} • Phone: {vendor.phone}
          </ThemedText>
        </View>
      </View>
    ))}
    {vendorsWithLogin.length > 5 && (
      <ThemedText type="small" style={styles.userMore} lightColor="rgba(255,255,255,0.5)" darkColor="rgba(255,255,255,0.5)">
        +{vendorsWithLogin.length - 5} more
      </ThemedText>
    )}
  </View>
)}

      {/* Debug Info - Remove in production */}
      <View style={styles.debugInfo}>
        <ThemedText type="small" style={styles.debugText} lightColor="rgba(255,255,255,0.4)" darkColor="rgba(255,255,255,0.4)">
          Login mode: {loginMode}
        </ThemedText>
        <ThemedText type="small" style={styles.debugText} lightColor="rgba(255,255,255,0.4)" darkColor="rgba(255,255,255,0.4)">
          Engineers with credentials: {engineers.length}
        </ThemedText>
      <ThemedText type="small" style={styles.debugText} lightColor="rgba(255,255,255,0.4)" darkColor="rgba(255,255,255,0.4)">
  Clients with credentials: {clientsWithLogin.length}
</ThemedText>
<ThemedText type="small" style={styles.debugText} lightColor="rgba(255,255,255,0.4)" darkColor="rgba(255,255,255,0.4)">
  Vendors with credentials: {vendorsWithLogin.length}
</ThemedText>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={['#1E3A5F', '#2D4A6F', '#3D5A80']}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Feather name="hexagon" size={48} color="#FFFFFF" />
          </View>
          <ThemedText type="h2" style={styles.title} lightColor="#FFFFFF" darkColor="#FFFFFF">
            Construction ERP
          </ThemedText>
          <ThemedText type="body" style={styles.subtitle} lightColor="rgba(255,255,255,0.7)" darkColor="rgba(255,255,255,0.7)">
            {loginMode === 'role-select' 
              ? 'Select your role to continue' 
              : getLoginFormTitle()}
          </ThemedText>
          {loginMode !== 'role-select' && (
            <ThemedText type="small" style={styles.formSubtitle} lightColor="rgba(255,255,255,0.6)" darkColor="rgba(255,255,255,0.6)">
              {getLoginFormSubtitle()}
            </ThemedText>
          )}
        </View>

        {loginMode === 'role-select' ? (
          // Role Selection View
          <View style={styles.rolesGrid}>
            <RoleCard
              role="admin"
              label="Admin"
              icon="shield"
              color="#2563EB"
              onPress={() => handleRoleSelect('admin')}
            />
            <RoleCard
              role="engineer"
              label="Engineer"
              icon="tool"
              color="#7C3AED"
              onPress={() => handleRoleSelect('engineer')}
            />
            <RoleCard
              role="client"
              label="Client"
              icon="briefcase"
              color="#059669"
              onPress={() => handleRoleSelect('client')}
            />
            <RoleCard
              role="vendor"
              label="Vendor"
              icon="package"
              color="#DC2626"
              onPress={() => handleRoleSelect('vendor')}
            />
          <RoleCard
  role="site-engineer"
  label="Site Engineer"
  icon="map-pin"
  color="#F97316"
  onPress={() => handleRoleSelect('site-engineer')}
/>


          </View>
        ) : (
          // Login Form (for client, engineer, or vendor)
          renderLoginForm()
        )}

        {error && loginMode === 'role-select' ? (
          <View style={styles.errorContainer}>
            <Feather name="alert-circle" size={16} color="#FCA5A5" />
            <ThemedText type="small" style={styles.error} lightColor="#FCA5A5" darkColor="#FCA5A5">
              {error}
            </ThemedText>
          </View>
        ) : null}

        {isLoggingIn && loginMode === 'role-select' ? (
          <ThemedText type="small" style={styles.hint} lightColor="rgba(255,255,255,0.7)" darkColor="rgba(255,255,255,0.7)">
            Logging in...
          </ThemedText>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
  },
  formSubtitle: {
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
 rolesGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
},

 roleCard: {
  width: '30%',          // 👈 compact (3 per row on web)
  backgroundColor: 'rgba(255,255,255,0.1)',
  borderRadius: BorderRadius.md,
  paddingVertical: Spacing.md,
  paddingHorizontal: Spacing.sm,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.2)',
  marginBottom: Spacing.lg,
},

iconContainer: {
  width: 40,
  height: 40,
  borderRadius: BorderRadius.sm,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: Spacing.xs,
},

 roleLabel: {
  textAlign: 'center',
  fontWeight: '600',
  fontSize: 12,
},

  form: {
    marginTop: Spacing.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  backText: {
    color: '#FFFFFF',
  },
  label: {
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  input: {
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    color: '#FFFFFF',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)'
  },
  loginButton: {
    marginTop: Spacing.md,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontWeight: '700',
  },
  hint: {
    marginTop: Spacing.sm,
    fontSize: 12,
    textAlign: 'center'
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  error: {
    fontSize: 13,
    textAlign: 'center'
  },
  usersList: {
    marginTop: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  usersListTitle: {
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '500',
  },
  userDetails: {
    fontSize: 11,
    marginTop: 2,
  },
  userMore: {
    fontSize: 12,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  defaultCredentials: {
    marginTop: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  defaultCredentialsTitle: {
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  credentialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  credentialText: {
    fontSize: 12,
  },
  debugInfo: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: BorderRadius.sm,
  },
  debugText: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
});