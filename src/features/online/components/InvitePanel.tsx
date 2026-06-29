import { useState } from 'react';
import { Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

import { palette, radii, spacing } from '../../../core/design/tokens';
import { useTheme } from '../../../core/design/ThemeProvider';
import { AppText, Card, GameButton, Icon, PressableScale } from '../../../core/ui';
import { Feedback } from '../../../core/services';

/** Code + QR + copy + share — every way to invite friends into a lobby. */
export function InvitePanel({ code, joinUrl }: { code: string; joinUrl: string }) {
  const theme = useTheme();
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    Feedback.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const share = async () => {
    Feedback.tap();
    try {
      await Share.share({ message: `Komm in meine GameNight-Lobby! Code: ${code}\n${joinUrl}` });
    } catch {
      /* dismissed */
    }
  };

  return (
    <Card style={{ gap: spacing.md, alignItems: 'center' }}>
      <AppText variant="label" color="textFaint" uppercase>
        Lobby-Code
      </AppText>

      <PressableScale feedback="tap" onPress={copy}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {code.split('').map((c, i) => (
            <View
              key={i}
              style={{
                width: 42,
                height: 54,
                borderRadius: radii.md,
                backgroundColor: theme.colors.surfaceAlt,
                borderWidth: 1,
                borderColor: theme.colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText variant="heading" color="primaryBright">
                {c}
              </AppText>
            </View>
          ))}
        </View>
      </PressableScale>

      {showQr && (
        <View style={{ padding: spacing.md, backgroundColor: '#FFFFFF', borderRadius: radii.lg }}>
          <QRCode value={joinUrl} size={160} backgroundColor="#FFFFFF" color={palette.night1} />
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' }}>
        <View style={{ flex: 1 }}>
          <GameButton
            label={copied ? 'Kopiert!' : 'Code kopieren'}
            variant="secondary"
            size="sm"
            leftIcon={<Icon name={copied ? 'checkmark' : 'copy'} size={18} color="text" />}
            onPress={copy}
          />
        </View>
        <PressableScale
          feedback="tap"
          onPress={() => setShowQr((q) => !q)}
          style={{
            width: 46,
            height: 46,
            borderRadius: radii.lg,
            backgroundColor: theme.colors.surfaceAlt,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="qr-code" size={22} color={showQr ? 'primaryBright' : 'text'} />
        </PressableScale>
        <PressableScale
          feedback="tap"
          onPress={share}
          style={{
            width: 46,
            height: 46,
            borderRadius: radii.lg,
            backgroundColor: theme.colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="share-social" size={22} color="onPrimary" />
        </PressableScale>
      </View>
    </Card>
  );
}
