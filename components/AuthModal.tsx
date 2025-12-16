import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const COLORS = {
  background: '#121212',
  white: '#FFFFFF',
  emeraldLight: '#34D399',
  emeraldDark: '#059669',
  error: '#EF4444',
};

type AuthModalProps = {
  visible: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
};

export function AuthModal({ visible, onClose, onAuthSuccess }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password || (isSignUp && !username)) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // Inscription
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          // Le profil est créé automatiquement par le trigger
          // On met à jour uniquement le username
          await new Promise(resolve => setTimeout(resolve, 500)); // Attendre que le trigger se termine
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ username: username })
            .eq('id', authData.user.id);

          if (updateError) {
            console.warn('Error updating username:', updateError);
          }

          Alert.alert('Succès', 'Compte créé ! Vous êtes maintenant connecté.');
          resetForm();
          onAuthSuccess();
        }
      } else {
        // Connexion
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        Alert.alert('Succès', 'Connexion réussie !');
        resetForm();
        onAuthSuccess();
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Bouton fermer */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.white} />
          </Pressable>

          {/* Titre */}
          <Text style={styles.title}>
            {isSignUp ? 'INSCRIPTION' : 'CONNEXION'}
          </Text>

          {/* Champs du formulaire */}
          {isSignUp && (
            <TextInput
              style={styles.input}
              placeholder="Pseudo"
              placeholderTextColor="#666"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {/* Bouton principal */}
          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? 'CRÉER UN COMPTE' : 'SE CONNECTER'}
              </Text>
            )}
          </Pressable>

          {/* Toggle entre inscription/connexion */}
          <Pressable
            style={styles.toggleButton}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.toggleText}>
              {isSignUp
                ? 'Déjà un compte ? Se connecter'
                : "Pas de compte ? S'inscrire"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 30,
    borderWidth: 1,
    borderColor: COLORS.emeraldLight,
    shadowColor: COLORS.emeraldLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
    zIndex: 1,
  },
  title: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    letterSpacing: 2,
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: COLORS.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: COLORS.emeraldLight,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  toggleButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    color: COLORS.emeraldLight,
    fontSize: 14,
  },
});
