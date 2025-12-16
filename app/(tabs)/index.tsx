import { StyleSheet, View, Text, Pressable, GestureResponderEvent, Platform, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Canvas, Text as SkiaText, Skia, BlurMask, Group, matchFont, Circle } from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
  SlideOutDown,
} from 'react-native-reanimated';
import { useEffect, useState, useCallback, useRef } from 'react';

// Types pour les phases du jeu
type GamePhase = 'home' | 'starting' | 'countdown' | 'playing' | 'gameover';

// Dimensions de l'écran
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Configuration du jeu (selon requirements.md)
const GAME_CONFIG = {
  circleSize: 96, // Diamètre du cercle en px
  initialDuration: 1200, // Durée d'affichage initiale en ms
  minDuration: 400, // Durée minimale en ms
  accelerationFactor: 0.98, // Facteur de réduction de durée
  margin: 24, // Marge minimale des bords
  hitSlop: 6, // Tolérance supplémentaire pour le tap
};

// Couleurs du jeu
const COLORS = {
  background: '#121212', // Deep charcoal
  neonPurple: '#8B5CF6', // Violet principal
  neonPurpleGlow: '#A78BFA', // Violet plus clair pour le glow
  white: '#FFFFFF',
  ripple: 'rgba(255, 255, 255, 0.3)', // Blanc semi-transparent pour le ripple
  emeraldLight: '#34D399', // Vert émeraude clair
  emeraldDark: '#059669', // Vert émeraude foncé
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Composant pour afficher le score avec un dégradé (petit - pour highscore)
function GradientScore({ score }: { score: number }) {
  return (
    <MaskedView
      maskElement={
        <Text style={styles.highscoreValue}>{score}</Text>
      }
    >
      <LinearGradient
        colors={[COLORS.emeraldLight, COLORS.emeraldDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Text style={[styles.highscoreValue, { opacity: 0 }]}>{score}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

// Composant pour afficher le score actuel avec un dégradé (grand - pendant le jeu)
function GradientScoreLarge({ score }: { score: number }) {
  return (
    <MaskedView
      maskElement={
        <Text style={styles.currentScoreText}>{score}</Text>
      }
    >
      <LinearGradient
        colors={[COLORS.emeraldLight, COLORS.emeraldDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Text style={[styles.currentScoreText, { opacity: 0 }]}>{score}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

// Dimensions du canvas pour le titre (avec marges pour le glow)
const GLOW_PADDING = 50; // Espace pour que le glow ne soit pas coupé
const TITLE_CANVAS_WIDTH = 450 + GLOW_PADDING * 2;
const TITLE_CANVAS_HEIGHT = 240 + GLOW_PADDING * 2;
const TITLE_FONT_SIZE = 78; // 58 * 1.35 = 78.3 → 78

// Police système bold pour le titre
const titleFontStyle = {
  fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }),
  fontSize: TITLE_FONT_SIZE,
  fontWeight: 'bold' as const,
};
const titleFont = matchFont(titleFontStyle);

// Composant titre avec effet glow Skia
function NeonTitle() {
  const line1 = 'TAP THE';
  const line2 = 'CIRCLE';
  
  // Calculer la position X pour centrer chaque ligne
  const line1Width = titleFont.measureText(line1).width;
  const line2Width = titleFont.measureText(line2).width;
  const line1X = (TITLE_CANVAS_WIDTH - line1Width) / 2;
  const line2X = (TITLE_CANVAS_WIDTH - line2Width) / 2;
  
  // Positions Y (avec padding pour le glow)
  const line1Y = GLOW_PADDING + 80;
  const line2Y = GLOW_PADDING + 175;

  const glowColor = Skia.Color(COLORS.neonPurple);
  const textColor = Skia.Color(COLORS.white);

  return (
    <Canvas style={{ width: TITLE_CANVAS_WIDTH, height: TITLE_CANVAS_HEIGHT }}>
      {/* Couche de glow externe - très diffuse */}
      <Group>
        <BlurMask blur={25} style="solid" />
        <SkiaText
          x={line1X}
          y={line1Y}
          text={line1}
          font={titleFont}
          color={glowColor}
        />
        <SkiaText
          x={line2X}
          y={line2Y}
          text={line2}
          font={titleFont}
          color={glowColor}
        />
      </Group>
      
      {/* Couche de glow moyenne */}
      <Group>
        <BlurMask blur={12} style="solid" />
        <SkiaText
          x={line1X}
          y={line1Y}
          text={line1}
          font={titleFont}
          color={glowColor}
        />
        <SkiaText
          x={line2X}
          y={line2Y}
          text={line2}
          font={titleFont}
          color={glowColor}
        />
      </Group>
      
      {/* Couche de glow proche */}
      <Group>
        <BlurMask blur={4} style="solid" />
        <SkiaText
          x={line1X}
          y={line1Y}
          text={line1}
          font={titleFont}
          color={glowColor}
        />
        <SkiaText
          x={line2X}
          y={line2Y}
          text={line2}
          font={titleFont}
          color={glowColor}
        />
      </Group>
      
      {/* Texte principal blanc */}
      <SkiaText
        x={line1X}
        y={line1Y}
        text={line1}
        font={titleFont}
        color={textColor}
      />
      <SkiaText
        x={line2X}
        y={line2Y}
        text={line2}
        font={titleFont}
        color={textColor}
      />
    </Canvas>
  );
}

// Dimensions et style pour le Game Over
const GAMEOVER_GLOW_PADDING = 30;
const GAMEOVER_CANVAS_WIDTH = 380;
const GAMEOVER_CANVAS_HEIGHT = 80 + GAMEOVER_GLOW_PADDING * 2;
const GAMEOVER_FONT_SIZE = 48;

const gameOverFontStyle = {
  fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }),
  fontSize: GAMEOVER_FONT_SIZE,
  fontWeight: 'bold' as const,
};
const gameOverFont = matchFont(gameOverFontStyle);

// Couleur rouge pour le Game Over
const GAMEOVER_RED = '#EF4444';

// Composant Game Over avec effet glow Skia rouge
function NeonGameOver() {
  const text = 'GAME OVER';
  
  // Calculer la position X pour centrer
  const textWidth = gameOverFont.measureText(text).width;
  const textX = (GAMEOVER_CANVAS_WIDTH - textWidth) / 2;
  const textY = GAMEOVER_GLOW_PADDING + GAMEOVER_FONT_SIZE;

  const glowColor = Skia.Color(GAMEOVER_RED);
  const textColor = Skia.Color(COLORS.white);

  return (
    <Canvas style={{ width: GAMEOVER_CANVAS_WIDTH, height: GAMEOVER_CANVAS_HEIGHT }}>
      {/* Couche de glow externe - diffuse (moins puissante) */}
      <Group>
        <BlurMask blur={15} style="solid" />
        <SkiaText
          x={textX}
          y={textY}
          text={text}
          font={gameOverFont}
          color={glowColor}
        />
      </Group>
      
      {/* Couche de glow moyenne */}
      <Group>
        <BlurMask blur={8} style="solid" />
        <SkiaText
          x={textX}
          y={textY}
          text={text}
          font={gameOverFont}
          color={glowColor}
        />
      </Group>
      
      {/* Couche de glow proche */}
      <Group>
        <BlurMask blur={3} style="solid" />
        <SkiaText
          x={textX}
          y={textY}
          text={text}
          font={gameOverFont}
          color={glowColor}
        />
      </Group>
      
      {/* Texte principal blanc */}
      <SkiaText
        x={textX}
        y={textY}
        text={text}
        font={gameOverFont}
        color={textColor}
      />
    </Canvas>
  );
}

// Dimensions du canvas pour le countdown
const COUNTDOWN_CANVAS_SIZE = 200 + GLOW_PADDING * 2;
const COUNTDOWN_FONT_SIZE = 120;

// Police pour le countdown
const countdownFontStyle = {
  fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }),
  fontSize: COUNTDOWN_FONT_SIZE,
  fontWeight: 'bold' as const,
};
const countdownFont = matchFont(countdownFontStyle);

// Largeur de référence pour aligner tous les chiffres (basé sur "GO" qui est le plus large)
const referenceWidth = countdownFont.measureText('GO').width;

// Composant countdown avec effet glow Skia
function CountdownText({ text }: { text: string }) {
  // Calculer la position pour centrer le texte
  // On utilise toujours la même position X de référence pour l'alignement
  const textWidth = countdownFont.measureText(text).width;
  const centerX = COUNTDOWN_CANVAS_SIZE / 2;
  // Décaler le "1" de 10px à gauche pour un meilleur centrage visuel
  const offsetX = text === '1' ? -10 : 0;
  const textX = centerX - textWidth / 2 + offsetX;
  const textY = GLOW_PADDING + 110;

  const glowColor = Skia.Color(COLORS.neonPurple);
  const textColor = Skia.Color(COLORS.white);

  return (
    <Canvas style={{ width: COUNTDOWN_CANVAS_SIZE, height: COUNTDOWN_CANVAS_SIZE }}>
      {/* Couche de glow externe */}
      <Group>
        <BlurMask blur={30} style="solid" />
        <SkiaText
          x={textX}
          y={textY}
          text={text}
          font={countdownFont}
          color={glowColor}
        />
      </Group>
      
      {/* Couche de glow moyenne */}
      <Group>
        <BlurMask blur={15} style="solid" />
        <SkiaText
          x={textX}
          y={textY}
          text={text}
          font={countdownFont}
          color={glowColor}
        />
      </Group>
      
      {/* Couche de glow proche */}
      <Group>
        <BlurMask blur={5} style="solid" />
        <SkiaText
          x={textX}
          y={textY}
          text={text}
          font={countdownFont}
          color={glowColor}
        />
      </Group>
      
      {/* Texte principal blanc */}
      <SkiaText
        x={textX}
        y={textY}
        text={text}
        font={countdownFont}
        color={textColor}
      />
    </Canvas>
  );
}

// Composant cercle de jeu avec effet glow
const CIRCLE_GLOW_PADDING = 50; // Espace suffisant pour le glow
const CIRCLE_CANVAS_SIZE = GAME_CONFIG.circleSize + CIRCLE_GLOW_PADDING * 2;

// Type pour l'état du cercle
type CircleState = 'normal' | 'success' | 'fail' | 'exploding';

// Type pour un cercle individuel
type GameCircleData = {
  id: number;
  x: number;
  y: number;
  state: CircleState;
};

// Configuration de l'explosion
const EXPLOSION_PARTICLES = 20;
const EXPLOSION_CANVAS_SIZE = 300; // Plus grand pour contenir les particules qui s'éloignent

// Composant particule d'explosion
function ExplosionParticle({ 
  delay, 
  angle, 
  distance,
  color,
  size,
}: { 
  delay: number; 
  angle: number; 
  distance: number;
  color: string;
  size: number;
}) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);
  
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }));
    opacity.value = withDelay(delay, withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) }));
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => {
    const x = Math.cos(angle) * distance * progress.value;
    const y = Math.sin(angle) * distance * progress.value;
    const scale = 1 - progress.value * 0.5;
    
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale },
      ],
      opacity: opacity.value,
    };
  });
  
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: EXPLOSION_CANVAS_SIZE / 2 - size / 2,
          top: EXPLOSION_CANVAS_SIZE / 2 - size / 2,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 8,
        },
        animatedStyle,
      ]}
    />
  );
}

// Composant explosion complète (avec couleur paramétrable)
function CircleExplosion({ color = '#EF4444' }: { color?: string }) {
  // Générer les particules une seule fois au montage
  const [particles] = useState(() => 
    Array.from({ length: EXPLOSION_PARTICLES }, (_, i) => ({
      id: i,
      angle: (i / EXPLOSION_PARTICLES) * Math.PI * 2 + Math.random() * 0.5,
      distance: 80 + Math.random() * 60,
      delay: Math.random() * 50,
      size: 8 + Math.random() * 12,
    }))
  );
  
  return (
    <View style={{ width: EXPLOSION_CANVAS_SIZE, height: EXPLOSION_CANVAS_SIZE }}>
      {particles.map((particle) => (
        <ExplosionParticle
          key={particle.id}
          angle={particle.angle}
          distance={particle.distance}
          delay={particle.delay}
          color={color}
          size={particle.size}
        />
      ))}
    </View>
  );
}

function GameCircle({ state = 'normal' }: { state?: CircleState }) {
  const center = CIRCLE_CANVAS_SIZE / 2;
  const radius = GAME_CONFIG.circleSize / 2;
  
  // Couleurs selon l'état
  const getColors = () => {
    switch (state) {
      case 'success':
        return {
          circle: Skia.Color(COLORS.emeraldLight),
          glow: Skia.Color(COLORS.emeraldLight),
        };
      case 'fail':
        return {
          circle: Skia.Color('#EF4444'),
          glow: Skia.Color('#EF4444'),
        };
      default:
        return {
          circle: Skia.Color(COLORS.white),
          glow: Skia.Color(COLORS.neonPurple),
        };
    }
  };
  
  const colors = getColors();

  return (
    <Canvas style={{ width: CIRCLE_CANVAS_SIZE, height: CIRCLE_CANVAS_SIZE }}>
      {/* Glow externe */}
      <Group>
        <BlurMask blur={25} style="solid" />
        <Circle cx={center} cy={center} r={radius} color={colors.glow} />
      </Group>
      
      {/* Glow moyen */}
      <Group>
        <BlurMask blur={12} style="solid" />
        <Circle cx={center} cy={center} r={radius} color={colors.glow} />
      </Group>
      
      {/* Glow proche */}
      <Group>
        <BlurMask blur={4} style="solid" />
        <Circle cx={center} cy={center} r={radius} color={colors.glow} />
      </Group>
      
      {/* Cercle principal */}
      <Circle cx={center} cy={center} r={radius} color={colors.circle} />
    </Canvas>
  );
}

// Zone réservée pour le score en haut (highscore + score actuel)
const SCORE_AREA_HEIGHT = 160;

// Fonction pour générer une position aléatoire pour le cercle (sans chevauchement)
function getRandomCirclePosition(
  safeAreaTop: number, 
  safeAreaBottom: number,
  existingCircles: Array<{ x: number; y: number }> = []
): { x: number; y: number } {
  const margin = GAME_CONFIG.margin + CIRCLE_CANVAS_SIZE / 2;
  const minX = margin;
  const maxX = SCREEN_WIDTH - margin;
  const minY = safeAreaTop + SCORE_AREA_HEIGHT + margin; // En dessous du highscore et du score actuel
  const maxY = SCREEN_HEIGHT - safeAreaBottom - margin;
  
  // Distance minimale entre les centres de deux cercles (avec une marge de sécurité)
  const minDistance = CIRCLE_CANVAS_SIZE + 20; // Taille du canvas + 20px de marge
  
  // Essayer de trouver une position valide (max 50 tentatives)
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    const x = Math.random() * (maxX - minX) + minX;
    const y = Math.random() * (maxY - minY) + minY;
    
    // Vérifier si cette position chevauche un cercle existant
    const overlaps = existingCircles.some((circle) => {
      const distance = Math.sqrt(Math.pow(x - circle.x, 2) + Math.pow(y - circle.y, 2));
      return distance < minDistance;
    });
    
    if (!overlaps) {
      return { x, y };
    }
    
    attempts++;
  }
  
  // Fallback : si aucune position valide n'est trouvée après 50 tentatives, retourner quand même
  return {
    x: Math.random() * (maxX - minX) + minX,
    y: Math.random() * (maxY - minY) + minY,
  };
}

// Fonction pour vérifier si un tap est sur le cercle
function isTapOnCircle(tapX: number, tapY: number, circleX: number, circleY: number): boolean {
  const distance = Math.sqrt(Math.pow(tapX - circleX, 2) + Math.pow(tapY - circleY, 2));
  const hitRadius = GAME_CONFIG.circleSize / 2 + GAME_CONFIG.hitSlop;
  return distance <= hitRadius;
}

// Sons locaux (graves à aigus)
const SOUND_FILES = [
  require('../../assets/sounds/tap1.mp3'),
  require('../../assets/sounds/tap2.mp3'),
  require('../../assets/sounds/tap3.mp3'),
];

// Système de son pour les taps avec fichiers audio réels
class TapSoundSystem {
  private sounds: Audio.Sound[] = [];
  private isInitialized = false;
  
  // Initialiser et pré-charger tous les sons
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Configurer le mode audio
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      
      // Pré-charger tous les sons
      for (const soundFile of SOUND_FILES) {
        const { sound } = await Audio.Sound.createAsync(soundFile, {
          shouldPlay: false,
          volume: 0.4,
        });
        this.sounds.push(sound);
      }
      
      this.isInitialized = true;
      console.log('Tap sounds initialized successfully');
    } catch (error) {
      console.warn('Error initializing tap sounds:', error);
      this.isInitialized = false;
    }
  }
  
  // Obtenir l'index du son et le playback rate en fonction du score
  getSoundConfig(score: number): { soundIndex: number; rate: number } {
    // Progression sur 60 points
    const progress = Math.min(score / 60, 1);
    
    // Choisir le son de base (0, 1, ou 2)
    const soundIndexFloat = progress * (SOUND_FILES.length - 1);
    const soundIndex = Math.floor(soundIndexFloat);
    
    // Varier le rate pour affiner la hauteur (0.8 à 1.5)
    const rate = 0.8 + progress * 0.7;
    
    return {
      soundIndex: Math.min(soundIndex, SOUND_FILES.length - 1),
      rate,
    };
  }
  
  // Jouer un son avec variation de hauteur selon le score
  async playTapSound(score: number) {
    if (!this.isInitialized) {
      await this.initialize();
      if (!this.isInitialized) return;
    }
    
    try {
      const { soundIndex, rate } = this.getSoundConfig(score);
      const sound = this.sounds[soundIndex];
      
      if (sound) {
        // Réinitialiser la position et jouer
        await sound.setPositionAsync(0);
        await sound.setRateAsync(rate, true);
        await sound.playAsync();
      }
    } catch (error) {
      // Fallback silencieux
      console.warn('Error playing tap sound:', error);
    }
  }
  
  // Nettoyer les ressources
  async cleanup() {
    for (const sound of this.sounds) {
      try {
        await sound.unloadAsync();
      } catch {}
    }
    this.sounds = [];
    this.isInitialized = false;
  }
}

// Instance globale du système de son
const tapSoundSystem = new TapSoundSystem();

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  
  // Highscore (pour l'instant fixé à 0, sera persisté plus tard)
  const [highscore, setHighscore] = useState(0);
  
  // Phase du jeu
  const [gamePhase, setGamePhase] = useState<GamePhase>('home');
  const [countdownValue, setCountdownValue] = useState<string>('3');
  
  // État du jeu
  const [score, setScore] = useState(0);
  const [circles, setCircles] = useState<GameCircleData[]>([]);
  const [currentDuration, setCurrentDuration] = useState(GAME_CONFIG.initialDuration);
  const [successExplosions, setSuccessExplosions] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [failingCircle, setFailingCircle] = useState<{ id: number; x: number; y: number; state: CircleState } | null>(null);
  
  // Timers pour chaque cercle (map id -> timeout)
  const circleTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  
  // Flag synchrone pour bloquer les taps pendant le game over
  const isGameOverInProgressRef = useRef(false);
  
  // Refs pour accéder aux valeurs actuelles dans les callbacks
  const currentDurationRef = useRef(GAME_CONFIG.initialDuration);
  const scoreRef = useRef(0);
  
  // Animation pour l'effet néon pulsant (bouton)
  const glowIntensity = useSharedValue(1);
  
  // Animation pour le ripple effect
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  const rippleX = useSharedValue(0);
  const rippleY = useSharedValue(0);

  // Synchroniser les refs avec les states
  useEffect(() => {
    currentDurationRef.current = currentDuration;
  }, [currentDuration]);
  
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    // Animation du bouton
    glowIntensity.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    
    // Initialiser le système de sons
    tapSoundSystem.initialize().catch(error => 
      console.warn('Error initializing tap sounds:', error)
    );
    
    // Nettoyer les sons au démontage du composant
    return () => {
      tapSoundSystem.cleanup();
    };
  }, []);

  // Gestion du countdown
  useEffect(() => {
    if (gamePhase !== 'countdown') return;
    
    const countdownSequence = ['3', '2', '1', 'GO'];
    let currentIndex = 0;
    
    setCountdownValue(countdownSequence[currentIndex]);
    
    const interval = setInterval(() => {
      currentIndex++;
      if (currentIndex < countdownSequence.length) {
        setCountdownValue(countdownSequence[currentIndex]);
        // Haptic feedback pour chaque étape du countdown
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        // Countdown terminé, passer en phase playing
        clearInterval(interval);
        setGamePhase('playing');
        // Haptic plus fort pour le GO
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gamePhase]);

  // Fonction appelée en cas de game over (avec l'id et la position du cercle qui a expiré)
  const handleGameOver = useCallback((circleId: number, circleX: number, circleY: number) => {
    // Bloquer immédiatement les taps (ref synchrone)
    isGameOverInProgressRef.current = true;
    
    // Annuler tous les timers
    circleTimersRef.current.forEach((timer) => clearTimeout(timer));
    circleTimersRef.current.clear();
    
    // Supprimer tous les cercles
    circlesRef.current = [];
    setCircles([]);
    
    // Créer le cercle en état d'échec pour l'animation
    setFailingCircle({ id: circleId, x: circleX, y: circleY, state: 'fail' });
    
    // Haptic feedback puissant
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Après un court flash, lancer l'explosion
    setTimeout(() => {
      setFailingCircle(prev => prev ? { ...prev, state: 'exploding' } : null);
    }, 80);
    
    // Après l'explosion, afficher le game over
    setTimeout(() => {
      setFailingCircle(null);
      
      // Mettre à jour le highscore si nécessaire
      const currentScore = scoreRef.current;
      if (currentScore > highscore) {
        setHighscore(currentScore);
      }
      
      // Passer en phase game over
      setGamePhase('gameover');
    }, 500);
  }, [highscore]);

  // Ref pour les cercles (pour les passer à getRandomCirclePosition)
  const circlesRef = useRef<GameCircleData[]>([]);
  
  // Synchroniser la ref avec l'état
  useEffect(() => {
    circlesRef.current = circles;
  }, [circles]);
  
  // Fonction pour faire apparaître un nouveau cercle
  const spawnCircle = useCallback((customDuration?: number) => {
    // Utiliser la ref pour avoir les cercles actuels (évite les problèmes de closure)
    const existingCircles = circlesRef.current;
    const newPosition = getRandomCirclePosition(insets.top, insets.bottom, existingCircles);
    const circleId = Date.now() + Math.random(); // ID unique
    
    const newCircle: GameCircleData = {
      id: circleId,
      x: newPosition.x,
      y: newPosition.y,
      state: 'normal',
    };
    
    // Mettre à jour la ref IMMÉDIATEMENT (pour les spawns rapides)
    circlesRef.current = [...circlesRef.current, newCircle];
    
    // Ajouter le cercle à l'état React
    setCircles(prev => [...prev, newCircle]);
    
    // Timer pour la disparition (game over si pas cliqué à temps)
    // Chaque cercle a son propre timer indépendant
    const duration = customDuration || currentDurationRef.current;
    console.log('Spawning circle', circleId, 'with duration', duration);
    
    const timer = setTimeout(() => {
      // Vérifier si le game over n'est pas déjà en cours
      if (isGameOverInProgressRef.current) return;
      console.log('Timer expired for circle', circleId);
      // Le cercle a disparu sans être cliqué = Game Over
      handleGameOver(circleId, newPosition.x, newPosition.y);
    }, duration);
    
    circleTimersRef.current.set(circleId, timer);
  }, [insets.top, insets.bottom, handleGameOver]);

  // Démarrer le jeu quand on passe en phase playing
  useEffect(() => {
    if (gamePhase === 'playing') {
      // Réinitialiser le jeu
      setScore(0);
      scoreRef.current = 0;
      setCurrentDuration(GAME_CONFIG.initialDuration);
      currentDurationRef.current = GAME_CONFIG.initialDuration;
      setCircles([]);
      circlesRef.current = []; // Reset aussi la ref
      setFailingCircle(null);
      
      // Faire apparaître le premier cercle après un court délai
      setTimeout(() => {
        spawnCircle();
      }, 100);
    }
    
    return () => {
      // Nettoyer tous les timers si on quitte la phase playing
      circleTimersRef.current.forEach((timer) => clearTimeout(timer));
      circleTimersRef.current.clear();
    };
  }, [gamePhase, spawnCircle]);

  // Fonction appelée quand un cercle est cliqué avec succès
  const handleCircleHit = useCallback((circleId: number, circleX: number, circleY: number) => {
    // Annuler le timer de ce cercle
    const timer = circleTimersRef.current.get(circleId);
    if (timer) {
      clearTimeout(timer);
      circleTimersRef.current.delete(circleId);
    }
    
    // Haptic feedback succès avec variation selon le score
    const hapticStyle = scoreRef.current < 20 
      ? Haptics.ImpactFeedbackStyle.Light 
      : scoreRef.current < 40 
        ? Haptics.ImpactFeedbackStyle.Medium 
        : Haptics.ImpactFeedbackStyle.Heavy;
    Haptics.impactAsync(hapticStyle);
    
    // Son synthétique qui monte en hauteur avec le score
    tapSoundSystem.playTapSound(scoreRef.current).catch(() => {});
    
    // Incrémenter le score
    const newScore = scoreRef.current + 1;
    setScore(newScore);
    scoreRef.current = newScore;
    
    // Accélérer (réduire la durée)
    const newDuration = Math.max(GAME_CONFIG.minDuration, Math.round(currentDurationRef.current * GAME_CONFIG.accelerationFactor));
    setCurrentDuration(newDuration);
    currentDurationRef.current = newDuration;
    
    // Ajouter une explosion verte à la position du cercle touché
    const explosionId = Date.now();
    setSuccessExplosions(prev => [...prev, { id: explosionId, x: circleX, y: circleY }]);
    
    // Supprimer l'explosion après l'animation
    setTimeout(() => {
      setSuccessExplosions(prev => prev.filter(e => e.id !== explosionId));
    }, 500);
    
    // Supprimer le cercle touché (ref + state)
    circlesRef.current = circlesRef.current.filter(c => c.id !== circleId);
    setCircles(prev => prev.filter(c => c.id !== circleId));
    
    // Faire apparaître un nouveau cercle après un très court délai
    setTimeout(() => {
      // Si on vient d'atteindre le score 10, spawner 2 cercles avec une durée doublée
      if (newScore === 10) {
        const doubleDuration = newDuration * 2;
        spawnCircle(doubleDuration);
        setTimeout(() => spawnCircle(doubleDuration), 50); // Deuxième cercle avec léger décalage
      } else {
        spawnCircle();
      }
    }, 50);
  }, [spawnCircle]);

  // Flag pour éviter le double déclenchement
  const circleJustHitRef = useRef(false);
  
  // Gestion du tap à côté du cercle (= game over)
  const handleMissedTap = useCallback(() => {
    console.log('MISSED TAP - gamePhase:', gamePhase);
    if (gamePhase !== 'playing') return;
    // Ignorer si on vient de toucher le cercle (évite le double déclenchement)
    if (circleJustHitRef.current) return;
    // Vérification synchrone : si le game over est en cours, ignorer
    if (isGameOverInProgressRef.current) return;
    // S'il n'y a pas de cercles, ignorer
    if (circles.length === 0) return;
    // Déclencher le game over avec le premier cercle
    const firstCircle = circles[0];
    handleGameOver(firstCircle.id, firstCircle.x, firstCircle.y);
  }, [gamePhase, circles, handleGameOver]);
  
  // Gestion du tap sur un cercle spécifique (= succès)
  const handleCircleTap = useCallback((circleId: number, circleX: number, circleY: number) => {
    console.log('CIRCLE TAP - gamePhase:', gamePhase, 'circleId:', circleId);
    if (gamePhase !== 'playing') return;
    // Vérification synchrone : si le game over est en cours, ignorer
    if (isGameOverInProgressRef.current) return;
    // Marquer qu'on vient de toucher le cercle pour éviter que handleMissedTap se déclenche
    circleJustHitRef.current = true;
    setTimeout(() => { circleJustHitRef.current = false; }, 100);
    handleCircleHit(circleId, circleX, circleY);
  }, [gamePhase, handleCircleHit]);

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: 0.8 * glowIntensity.value,
      shadowRadius: 20 * glowIntensity.value,
      transform: [{ scale: 0.98 + 0.02 * glowIntensity.value }],
    };
  });

  const animatedRippleStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: rippleX.value },
        { translateY: rippleY.value },
        { scale: rippleScale.value },
      ],
      opacity: rippleOpacity.value,
    };
  });

  const triggerHaptics = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const startCountdown = () => {
    // Réinitialiser le flag de game over
    isGameOverInProgressRef.current = false;
    setGamePhase('countdown');
  };

  const handlePressIn = (event: GestureResponderEvent) => {
    // Récupérer les coordonnées du touch relatives au bouton
    const { locationX, locationY } = event.nativeEvent;
    
    // Positionner le ripple au point de touch (centré sur le point)
    rippleX.value = locationX - 150; // 150 = moitié de la taille max du ripple
    rippleY.value = locationY - 150;
    
    // Reset et lancer l'animation
    rippleScale.value = 0;
    rippleOpacity.value = 0.6;
    
    rippleScale.value = withTiming(1, { 
      duration: 400, 
      easing: Easing.out(Easing.ease) 
    });
    rippleOpacity.value = withTiming(0, { 
      duration: 400, 
      easing: Easing.out(Easing.ease) 
    });

    // Haptics
    runOnJS(triggerHaptics)();
  };

  const handleStart = () => {
    // Passer en phase starting pour faire tomber le titre
    setGamePhase('starting');
    // Attendre la fin de l'animation de chute (400ms) puis lancer le countdown
    setTimeout(() => {
      startCountdown();
    }, 450);
  };

  const handleRestart = () => {
    // Relancer le jeu
    startCountdown();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />
      
      {/* Zone de tap pour le jeu (détecte les taps à côté du cercle) */}
      {gamePhase === 'playing' && (
        <Pressable 
          style={StyleSheet.absoluteFill} 
          onPress={handleMissedTap}
        />
      )}
      
      {/* Highscore affiché en haut */}
      <View style={styles.highscoreContainer} pointerEvents="none">
        <Text style={styles.highscoreLabel}>HIGHSCORE</Text>
        <Text style={styles.highscoreDot}>•</Text>
        <GradientScore score={highscore} />
      </View>
      
      {/* Score actuel pendant le jeu */}
      {gamePhase === 'playing' && (
        <Animated.View 
          style={styles.scoreContainer}
          entering={FadeIn.duration(200)}
          pointerEvents="none"
        >
          <GradientScoreLarge score={score} />
        </Animated.View>
      )}
      
      {/* Titre du jeu au centre avec effet glow Skia - visible uniquement en phase home */}
      {gamePhase === 'home' && (
        <Animated.View 
          style={styles.titleContainer}
          exiting={SlideOutDown.duration(400).easing(Easing.in(Easing.quad))}
        >
          <NeonTitle />
        </Animated.View>
      )}
      
      {/* Countdown - visible uniquement en phase countdown */}
      {gamePhase === 'countdown' && (
        <Animated.View 
          style={styles.titleContainer}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
        >
          <CountdownText text={countdownValue} />
        </Animated.View>
      )}
      
      {/* Cercles de jeu - cliquables */}
      {gamePhase === 'playing' && circles.map((circle) => (
        <Animated.View
          key={circle.id}
          style={[
            styles.circleContainer,
            {
              left: circle.x - CIRCLE_CANVAS_SIZE / 2,
              top: circle.y - CIRCLE_CANVAS_SIZE / 2,
            },
          ]}
          entering={ZoomIn.duration(150)}
          exiting={ZoomOut.duration(100)}
        >
          <GameCircle state={circle.state} />
          {/* Zone de tap transparente par-dessus le cercle */}
          <Pressable 
            style={styles.circleHitArea}
            onPress={() => handleCircleTap(circle.id, circle.x, circle.y)}
          />
        </Animated.View>
      ))}
      
      {/* Cercle en état d'échec (flash rouge) */}
      {failingCircle && failingCircle.state === 'fail' && (
        <View
          style={[
            styles.circleContainer,
            {
              left: failingCircle.x - CIRCLE_CANVAS_SIZE / 2,
              top: failingCircle.y - CIRCLE_CANVAS_SIZE / 2,
            },
          ]}
        >
          <GameCircle state="fail" />
        </View>
      )}
      
      {/* Explosion rouge du cercle (game over) */}
      {failingCircle && failingCircle.state === 'exploding' && (
        <View
          style={[
            styles.explosionContainer,
            {
              left: failingCircle.x - EXPLOSION_CANVAS_SIZE / 2,
              top: failingCircle.y - EXPLOSION_CANVAS_SIZE / 2,
            },
          ]}
        >
          <CircleExplosion color="#EF4444" />
        </View>
      )}
      
      {/* Explosions vertes (succès) */}
      {successExplosions.map((explosion) => (
        <View
          key={explosion.id}
          style={[
            styles.explosionContainer,
            {
              left: explosion.x - EXPLOSION_CANVAS_SIZE / 2,
              top: explosion.y - EXPLOSION_CANVAS_SIZE / 2,
            },
          ]}
        >
          <CircleExplosion color={COLORS.emeraldLight} />
        </View>
      ))}
      
      {/* Bouton START positionné aux 3/4 de l'écran - visible uniquement en phase home */}
      {gamePhase === 'home' && (
        <Animated.View 
          style={styles.buttonContainer}
          exiting={FadeOut.duration(300)}
        >
          <AnimatedPressable
            style={[styles.startButton, animatedButtonStyle]}
            onPressIn={handlePressIn}
            onPress={handleStart}
          >
            <LinearGradient
              colors={[COLORS.emeraldLight, COLORS.emeraldDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.buttonGradient}
            >
              {/* Ripple effect */}
              <Animated.View style={[styles.ripple, animatedRippleStyle]} />
              <Text style={styles.startButtonText}>START</Text>
            </LinearGradient>
          </AnimatedPressable>
        </Animated.View>
      )}
      
      {/* Game Over screen */}
      {gamePhase === 'gameover' && (
        <>
          {/* Texte Game Over */}
          <Animated.View 
            style={styles.gameOverContainer}
            entering={ZoomIn.duration(450).easing(Easing.out(Easing.cubic))}
          >
            <NeonGameOver />
          </Animated.View>
          
          {/* Score en dessous avec fade in retardé */}
          <Animated.View 
            style={styles.gameOverScoreContainer}
            entering={FadeIn.duration(300).delay(250)}
          >
            <Text style={styles.gameOverScore}>Score : {score}</Text>
          </Animated.View>
          
          {/* Bouton RESTART */}
          <Animated.View 
            style={styles.buttonContainer}
            entering={FadeIn.duration(300).delay(200)}
          >
            <AnimatedPressable
              style={[styles.startButton, animatedButtonStyle]}
              onPressIn={handlePressIn}
              onPress={handleRestart}
            >
              <LinearGradient
                colors={[COLORS.emeraldLight, COLORS.emeraldDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.buttonGradient}
              >
                {/* Ripple effect */}
                <Animated.View style={[styles.ripple, animatedRippleStyle]} />
                <Text style={styles.startButtonText}>RESTART</Text>
              </LinearGradient>
            </AnimatedPressable>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  highscoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    gap: 12,
  },
  highscoreLabel: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 3,
  },
  highscoreDot: {
    color: COLORS.white,
    fontSize: 10,
    opacity: 0.5,
  },
  highscoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scoreContainer: {
    position: 'absolute',
    top: 150,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  currentScoreText: {
    fontSize: 55,
    fontWeight: 'bold',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -180, // Remonter le titre
  },
  gameOverContainer: {
    position: 'absolute',
    top: '32%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  gameOverScoreContainer: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  gameOverScore: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '600',
    opacity: 0.9,
  },
  circleContainer: {
    position: 'absolute',
  },
  explosionContainer: {
    position: 'absolute',
  },
  circleHitArea: {
    position: 'absolute',
    top: CIRCLE_GLOW_PADDING,
    left: CIRCLE_GLOW_PADDING,
    width: GAME_CONFIG.circleSize,
    height: GAME_CONFIG.circleSize,
    borderRadius: GAME_CONFIG.circleSize / 2,
  },
  buttonContainer: {
    position: 'absolute',
    top: '75%', // Position aux 3/4 de l'écran
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: 20 }], // Bouton positionné
  },
  startButton: {
    borderRadius: 30,
    overflow: 'hidden', // Important pour contenir le ripple
    // Effet néon avec shadow émeraude
    shadowColor: COLORS.emeraldLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    // Elevation pour Android
    elevation: 10,
  },
  buttonGradient: {
    paddingHorizontal: 60,
    paddingVertical: 18,
    borderRadius: 30,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.ripple,
  },
  startButtonText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
});
