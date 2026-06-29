import { useRef } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { radii, spacing } from '../../../core/design/tokens';
import { useTheme } from '../../../core/design/ThemeProvider';
import { AppText, Card, Icon, PressableScale } from '../../../core/ui';
import type { ChatMessage } from '../../../core/lobby/types';

/** A compact lobby chat: scrolling history + an inline composer. */
export function ChatPanel({
  messages,
  selfId,
  onSend,
}: {
  messages: ChatMessage[];
  selfId: string;
  onSend: (text: string) => void;
}) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const draft = useRef('');
  const scrollRef = useRef<ScrollView>(null);

  const submit = () => {
    const text = draft.current.trim();
    if (!text) return;
    onSend(text);
    draft.current = '';
    inputRef.current?.clear();
  };

  return (
    <Card padding="sm" style={{ gap: spacing.sm }}>
      <ScrollView
        ref={scrollRef}
        style={{ maxHeight: 130 }}
        contentContainerStyle={{ gap: 4, padding: spacing.xs }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <AppText variant="caption" color="textFaint" align="center">
            Sag Hallo 👋
          </AppText>
        ) : (
          messages.map((m) => (
            <AppText key={m.id} variant="caption" color="textMuted">
              <AppText variant="caption" style={{ color: m.persistentId === selfId ? theme.colors.primaryBright : theme.colors.text }}>
                {m.persistentId === selfId ? 'Du' : m.name}:
              </AppText>{' '}
              {m.text}
            </AppText>
          ))
        )}
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <TextInput
          ref={inputRef}
          defaultValue=""
          onChangeText={(t) => (draft.current = t)}
          onSubmitEditing={submit}
          placeholder="Nachricht…"
          placeholderTextColor={theme.colors.textFaint}
          returnKeyType="send"
          style={{
            flex: 1,
            color: theme.colors.text,
            fontFamily: 'Nunito_600SemiBold',
            fontSize: 14,
            backgroundColor: 'rgba(0,0,0,0.25)',
            borderRadius: radii.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        />
        <PressableScale
          feedback="tap"
          onPress={submit}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="send" size={18} color="onPrimary" />
        </PressableScale>
      </View>
    </Card>
  );
}
