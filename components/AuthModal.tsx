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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Clé pour le stockage du highscore local
const HIGHSCORE_STORAGE_KEY = '@circled_highscore';

// Fonction pour charger le highscore local
async function loadLocalHighscore(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(HIGHSCORE_STORAGE_KEY);
    if (value !== null) {
      const score = parseInt(value, 10);
      return score;
    }
  } catch (error) {
    console.warn('Error loading local highscore:', error);
  }
  return 0;
}

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
  userId: string | null;
  username: string | null;
};

export function AuthModal({ visible, onClose, onAuthSuccess, userId, username }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password || (isSignUp && !usernameInput)) {
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
          // Charger le highscore local s'il existe
          const localHighscore = await loadLocalHighscore();
          
          // Attendre que le trigger se termine
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Mettre à jour le username et le highscore local
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              username: usernameInput,
              highscore: localHighscore 
            })
            .eq('id', authData.user.id);

          if (updateError) {
            console.warn('Error updating profile:', updateError);
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
    setUsernameInput('');
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      Alert.alert('Succès', 'Vous êtes déconnecté');
      onClose();
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
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

          {userId ? (
            // Écran de profil si connecté
            <>
              <Text style={styles.title}>PROFIL</Text>
              
              <View style={styles.profileInfo}>
                <Text style={styles.connectedText}>Vous êtes connecté en tant que :</Text>
                <Text style={styles.usernameText}>{username || 'Utilisateur'}</Text>
              </View>

              <Pressable
                style={[styles.button, styles.signOutButton, loading && styles.buttonDisabled]}
                onPress={handleSignOut}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.buttonText}>DÉCONNEXION</Text>
                )}
              </Pressable>
            </>
          ) : (
            // Formulaire d'authentification si non connecté
            <>
              <Text style={styles.title}>
                {isSignUp ? 'INSCRIPTION' : 'CONNEXION'}
              </Text>

              {/* Champs du formulaire */}
              {isSignUp && (
                <TextInput
                  style={styles.input}
                  placeholder="Pseudo"
                  placeholderTextColor="#666"
                  value={usernameInput}
                  onChangeText={setUsernameInput}
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
            </>
          )}
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
  profileInfo: {
    alignItems: 'center',
    marginVertical: 30,
  },
  connectedText: {
    color: '#999',
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  usernameText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  signOutButton: {
    backgroundColor: COLORS.error,
    marginTop: 10,
  },
});
