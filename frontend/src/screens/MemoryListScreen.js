import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchMemories,
  semanticSearchMemories,
  togglePin,
  deleteMemory,
  setSearchQuery,
  setSelectedCategory,
  setSearchMode,
  setDateFilter,
} from '../store/slices/memorySlice';
import MemoryCard from '../components/memory/MemoryCard';
import SearchFilterBar from '../components/memory/SearchFilterBar';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';

const DATE_OPTIONS = [
  { id: 'all', label: 'All Time' },
  { id: 'week', label: 'Past Week' },
  { id: 'month', label: 'Past Month' },
];

export const MemoryListScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();
  const {
    memories,
    loading,
    searchQuery,
    selectedCategory,
    searchMode,
    dateFilter,
  } = useSelector((state) => state.memory);

  const [onlyPinned, setOnlyPinned] = useState(false);

  const loadMemories = useCallback(() => {
    if (searchMode === 'semantic' && searchQuery && searchQuery.trim().length > 0) {
      dispatch(
        semanticSearchMemories({
          query: searchQuery.trim(),
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          dateFilter: dateFilter !== 'all' ? dateFilter : undefined,
        })
      );
    } else {
      dispatch(
        fetchMemories({
          search: searchQuery || undefined,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
        })
      );
    }
  }, [dispatch, searchQuery, selectedCategory, searchMode, dateFilter]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const filteredMemories = memories.filter((item) => {
    if (onlyPinned && !item.isPinned) return false;
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search and Category Filter Bar */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={(text) => dispatch(setSearchQuery(text))}
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => dispatch(setSelectedCategory(cat))}
      />

      {/* Semantic / Keyword Search Mode & Date Filter Bar */}
      <View style={[styles.modeBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.modeToggleGroup}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => dispatch(setSearchMode('semantic'))}
            style={[
              styles.modeButton,
              searchMode === 'semantic' && {
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                borderColor: '#A78BFA',
              },
            ]}
          >
            <Ionicons
              name="sparkles"
              size={12}
              color={searchMode === 'semantic' ? '#A78BFA' : colors.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.modeButtonText,
                { color: searchMode === 'semantic' ? '#A78BFA' : colors.textMuted },
                searchMode === 'semantic' && { fontWeight: typography.weights.bold },
              ]}
            >
              Semantic Vector
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => dispatch(setSearchMode('keyword'))}
            style={[
              styles.modeButton,
              searchMode === 'keyword' && {
                backgroundColor: `${colors.primary}22`,
                borderColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name="search"
              size={12}
              color={searchMode === 'keyword' ? colors.primaryLight : colors.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.modeButtonText,
                { color: searchMode === 'keyword' ? colors.primaryLight : colors.textMuted },
                searchMode === 'keyword' && { fontWeight: typography.weights.bold },
              ]}
            >
              Keyword Match
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateFilterContainer}
        >
          {DATE_OPTIONS.map((opt) => {
            const isSelected = dateFilter === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                activeOpacity={0.75}
                onPress={() => dispatch(setDateFilter(opt.id))}
                style={[
                  styles.datePill,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                  isSelected && {
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    borderColor: '#6366F1',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.datePillText,
                    { color: colors.textSecondary },
                    isSelected && { color: '#818CF8', fontWeight: typography.weights.bold },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sub-bar with count and filters */}
      <View style={styles.filterMetaRow}>
        <View style={styles.countBadgeRow}>
          <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
            {filteredMemories.length} {filteredMemories.length === 1 ? 'memory' : 'memories'}
          </Text>
          {searchMode === 'semantic' && searchQuery.trim().length > 0 && (
            <View style={styles.semanticActivePill}>
              <Ionicons name="git-network-outline" size={11} color="#A78BFA" style={{ marginRight: 3 }} />
              <Text style={styles.semanticActiveText}>Embeddings Ranked</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setOnlyPinned(!onlyPinned)}
          style={[
            styles.pinFilterButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            onlyPinned && { backgroundColor: colors.amber, borderColor: colors.amber },
          ]}
        >
          <Ionicons
            name={onlyPinned ? 'pin' : 'pin-outline'}
            size={13}
            color={onlyPinned ? '#FFFFFF' : colors.textSecondary}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.pinFilterText,
              { color: onlyPinned ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            Pinned Only
          </Text>
        </TouchableOpacity>
      </View>

      {/* Memory List */}
      {loading && memories.length === 0 ? (
        <LoadingSpinner message="Searching memories..." fullScreen />
      ) : (
        <FlatList
          data={filteredMemories}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 95 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadMemories}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={searchMode === 'semantic' ? 'sparkles-outline' : 'search-outline'}
              title="No memories match"
              description={
                searchQuery
                  ? `No memories found matching "${searchQuery}". Try a broader semantic concept or different category.`
                  : 'Start capturing your voice notes and memories.'
              }
              actionTitle="Record Memo"
              onAction={() => navigation.navigate('Record')}
            />
          }
          renderItem={({ item }) => (
            <MemoryCard
              memory={item}
              onPress={() => navigation.navigate('MemoryDetail', { memoryId: item._id })}
              onTogglePin={(id) => dispatch(togglePin(id))}
              onDelete={(id) => dispatch(deleteMemory(id))}
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modeBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  modeToggleGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeButtonText: {
    fontSize: 11,
  },
  dateFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  datePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.xs,
    borderWidth: 1,
  },
  datePillText: {
    fontSize: 10,
  },
  filterMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  countBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultsCount: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  semanticActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  semanticActiveText: {
    fontSize: 10,
    color: '#A78BFA',
    fontWeight: typography.weights.semibold,
  },
  pinFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pinFilterText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.semibold,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
});

export default MemoryListScreen;
