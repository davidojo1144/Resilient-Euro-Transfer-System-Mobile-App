import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import App from '../App';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Utility to set initial server balance in mock API storage
const SERVER_KEY = 'mock_server_balance';

beforeEach(async () => {
  await AsyncStorage.setItem(SERVER_KEY, JSON.stringify(500));
});

test('optimistic UI updates balance when sending', async () => {
  const { getByPlaceholderText, getByText } = render(<App />);

  const amountInput = getByPlaceholderText('Amount (€)');
  fireEvent.changeText(amountInput, '50');

  const sendBtn = getByText('Send');
  fireEvent.press(sendBtn);

  await waitFor(() => {
    const balanceText = getByText(/Balance:/);
    expect(balanceText.props.children.join('')).toContain('€450.00');
  });
});

test('anti-fraud: blocks request exceeding effective balance', async () => {
  const { getByPlaceholderText, getByText } = render(<App />);
  const amt = getByPlaceholderText('Amount (€)');
  const sendBtn = getByText('Send');

  // First queue €60 => effective balance 440
  fireEvent.changeText(amt, '60');
  fireEvent.press(sendBtn);

  // Attempt to queue another €500 => should not be allowed (button disabled)
  fireEvent.changeText(amt, '500');
  expect(sendBtn.props.disabled).toBe(true);
});