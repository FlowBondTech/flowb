import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  FlatListProps,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface DataListProps<T> extends Omit<FlatListProps<T>, 'data' | 'renderItem'> {
  data: T[];
  renderItem: FlatListProps<T>['renderItem'];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  emptyMessage?: string;
  emptyIcon?: string;
}

export function DataList<T>({
  data,
  renderItem,
  loading,
  refreshing = false,
  onRefresh,
  onEndReached,
  emptyMessage = 'No items',
  emptyIcon = '',
  ...rest
}: DataListProps<T>) {
  if (loading && data.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(_, i) => String(i)}
      contentContainerStyle={data.length === 0 ? styles.center : styles.list}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
            progressBackgroundColor={colors.background.depth1}
          />
        ) : undefined
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      ListEmptyComponent={
        <View style={styles.empty}>
          {emptyIcon ? <Text style={styles.emptyIcon}>{emptyIcon}</Text> : null}
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      }
      ListFooterComponent={
        loading && data.length > 0 ? (
          <ActivityIndicator
            color={colors.accent.primary}
            style={styles.footer}
          />
        ) : null
      }
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyIcon: { fontSize: 40, marginBottom: spacing.md },
  emptyText: { ...typography.body, color: colors.text.tertiary },
  footer: { paddingVertical: spacing.lg },
});
