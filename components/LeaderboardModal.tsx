import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const COLORS = {
  background: '#121212',
  white: '#FFFFFF',
  emeraldLight: '#34D399',
  emeraldDark: '#059669',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

type LeaderboardEntry = {
  id: string;
  username: string;
  highscore: number;
};

type LeaderboardModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function LeaderboardModal({ visible, onClose }: LeaderboardModalProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadLeaderboard();
    }
  }, [visible]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, highscore')
        .order('highscore', { ascending: false })
        .limit(10);

      if (error) throw error;

      setLeaderboard(data || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return COLORS.gold;
    if (rank === 2) return COLORS.silver;
    if (rank === 3) return COLORS.bronze;
    return COLORS.emeraldLight;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '👑';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
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
          <Text style={styles.title}>CLASSEMENT</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.emeraldLight} />
            </View>
          ) : (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {leaderboard.length === 0 ? (
                <Text style={styles.emptyText}>Aucun score enregistré</Text>
              ) : (
                leaderboard.map((entry, index) => {
                  const rank = index + 1;
                  return (
                    <View key={entry.id} style={styles.leaderboardItem}>
                      <View style={styles.rankContainer}>
                        <Text style={[styles.rankText, { color: getRankColor(rank) }]}>
                          {getRankIcon(rank)} #{rank}
                        </Text>
                      </View>
                      <View style={styles.usernameContainer}>
                        <Text style={styles.usernameText} numberOfLines={1}>
                          {entry.username || 'Joueur anonyme'}
                        </Text>
                      </View>
                      <View style={styles.scoreContainer}>
                        <Text style={styles.scoreText}>{entry.highscore}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
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
    maxHeight: '70%',
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
    marginBottom: 25,
    letterSpacing: 2,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  scrollView: {
    maxHeight: 400,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  rankContainer: {
    width: 60,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  usernameContainer: {
    flex: 1,
    marginHorizontal: 10,
  },
  usernameText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  scoreContainer: {
    minWidth: 50,
    alignItems: 'flex-end',
  },
  scoreText: {
    color: COLORS.emeraldLight,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
