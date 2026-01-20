import React, { useState } from 'react';
import { View, Text, Button, Alert, TextInput } from 'react-native';
import { useData } from '@/context/DataContext';

export default function SimpleTestScreen() {
  const { employees, addEmployee } = useData();
  const [testName, setTestName] = useState('Test Employee');

  const testSimpleAdd = async () => {
    console.log('🧪 Starting simple test...');
    console.log('🧪 Current employees:', employees.length);
    
    try {
      const testEmployee = {
        id: 'test-' + Date.now(),
        name: testName,
        age: 30,
        address: 'Test Address',
        role: 'mason' as const,
        salary: 800,
        faceImage: undefined,
        faceEnrolled: false,
        fingerprintEnrolled: false,
      };

      console.log('🧪 About to call addEmployee with:', testEmployee);
      
      // Test just the DataContext addEmployee function
      await addEmployee(testEmployee);
      
      console.log('✅ addEmployee completed successfully');
      Alert.alert('Success', `Employee "${testName}" added! Total: ${employees.length + 1}`);
      
    } catch (error) {
      console.error('❌ Error in simple test:', error);
      Alert.alert('Error', `Failed: ${error}`);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>Simple Employee Test</Text>
      <Text style={{ marginBottom: 10 }}>Current Employees: {employees.length}</Text>
      
      <TextInput
        style={{ 
          borderWidth: 1, 
          padding: 10, 
          marginBottom: 20,
          borderRadius: 5
        }}
        value={testName}
        onChangeText={setTestName}
        placeholder="Enter test employee name"
      />
      
      <Button 
        title="Test Simple Add Employee" 
        onPress={testSimpleAdd}
      />
      
      <Text style={{ marginTop: 20, fontSize: 12, color: 'gray' }}>
        This tests ONLY the DataContext addEmployee function
      </Text>
    </View>
  );
}
