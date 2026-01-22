import React, { useEffect } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { useData } from '@/context/DataContext';
import { EmployeesService } from '@/firebaseServices/employeesService';

export default function TestFirebaseScreen() {
  const { employees, addEmployee } = useData();

  useEffect(() => {
    console.log('🧪 TestFirebaseScreen mounted, current employees:', employees.length);
  }, [employees]);

  const testAddEmployee = async () => {
    try {
      console.log('🧪 Testing Firebase employee addition...');
      
      const testEmployee = {
        id: 'test-123',
        name: 'Test Employee',
        age: 30,
        address: 'Test Address',
        role: 'mason' as const,
        salary: 800,
        faceImage: undefined,
        faceEnrolled: false,
        fingerprintEnrolled: false,
      };

      console.log('🧪 Calling EmployeesService.add...');
      const id = await EmployeesService.add(testEmployee);
      console.log('✅ Firebase add successful, ID:', id);
      
      console.log('🧪 Calling addEmployee from DataContext...');
      await addEmployee(testEmployee);
      console.log('✅ DataContext add successful');
      
      Alert.alert('Success', 'Test employee added successfully!');
    } catch (error) {
      console.error('❌ Test failed:', error);
      Alert.alert('Error', `Test failed: ${error}`);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>Firebase Test Screen</Text>
      <Text style={{ marginBottom: 10 }}>Current Employees: {employees.length}</Text>
      <Text style={{ marginBottom: 10 }}>This tests the real DataContext and Firebase services</Text>
      <Button title="Test Add Employee (Real DataContext)" onPress={testAddEmployee} />
    </View>
  );
}
