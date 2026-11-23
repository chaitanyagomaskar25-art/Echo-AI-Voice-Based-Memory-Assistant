import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchMemories,
  fetchMoreMemories,
  semanticSearchMemories,
  togglePin,
  toggleFavorite,
  toggleArchive,
  deleteMemory,
  setSearchQuery,
  setSelectedCategory,
  setSearchMode,
  setDateFilter,
  setActiveTab,
} from '../store/slices/memorySlice';
import MemoryCard from '../components/memory/MemoryCard';
import SearchFilterBar from '../components/memory/SearchFilterBar';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import { ROUTES } from '../navigation/routes';

const DATE_OPTIONS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Past Week' },
  { id: 'month', label: 'Past Month' },
];

const TABS = [
  { id: 'all', label: 'All Memories', icon: 'layers-outline' },
  { id: 'favorites', label: 'Favorites', icon: 'star-outline' },
  { id: 'archived', label: 'Archived', icon: 'archive-outline' },
];

export const MemoryListScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();

  const {
    memories,
    loading,
    loadingMore,
    hasMore,
    total,
    searchQuery,
    selectedCategory,
    searchMode,
    dateFilter,
    activeTab,
  } = useSelector((state) => state.memory);

  const [onlyPinned, setOnlyPinned] = useState(false);

  // Load memories from backend based on active filters and tabs
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
      const isFav = activeTab === 'favorites' ? true : undefined;
      const isArch = activeTab === 'archived' ? 'true' : 'false';

      dispatch(
        fetchMemories({
          search: searchQuery || undefined,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          dateFilter: dateFilter !== 'all' ? dateFilter : undefined,
          isFavorite: isFav,
          isArchived: isArch,
          isPinned: onlyPinned ? true : undefined,
          page: 1,
          limit: 15,
        })
      );
    }
  }, [dispatch, searchQuery, selectedCategory, searchMode, dateFilter, activeTab, onlyPinned]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  // Handle pagination on reaching end of list
  const handleLoadMore = () => {
    if (searchMode === 'semantic' && searchQuery.trim().length > 0) return;
    if (hasMore && !loading && !loadingMore) {
      const isFav = activeTab === 'favorites' ? true : undefined;
      const isArch = activeTab === 'archived' ? 'true' : 'false';

      dispatch(
        fetchMoreMemories({
          search: searchQuery || undefined,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          dateFilter: dateFilter !== 'all' ? dateFilter : undefined,
          isFavorite: isFav,
          isArchived: isArch,
          isPinned: onlyPinned ? true : undefined,
          limit: 15,
        })
      );
    }
  };

  const handleDelete = (id, title) => {
    Alert.alert(
      'Delete Memory',
      `Permanently delete "${title || 'this memory'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteMemory(id)),
        },
      ]
    );
  };

  const getEmptyStateDetails = () => {
    if (searchQuery.trim().length > 0) {
      return {
        icon: searchMode === 'semantic' ? 'sparkles-outline' : 'search-outline',
        title: 'No matching memories',
        description: `No memories match "${searchQuery}". Try adjusting your filters or search keywords.`,
      };
    }
    if (activeTab === 'favorites') {
      return {
        icon: 'star-outline',
        title: 'No favorite memories yet',
        description: 'Tap the star icon on any memory card to bookmark your most important thoughts here.',
      };
    }
    if (activeTab === 'archived') {
      return {
        icon: 'archive-outline',
        title: 'Archive is empty',
        description: 'Archived memories are stored safely out of your main library. You can restore them anytime.',
      };
    }
    return {
      icon: 'mic-outline',
      title: 'No memories captured yet',
      description: 'Record your first voice thought or text note to start building your personal memory vault.',
    };
  };

  const emptyDetails = getEmptyStateDetails();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 1. Top Section Tabs: All Memories | Favorites | Archived */}
      <View style={[styles.sectionTabsWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.8}
              onPress={() => dispatch(setActiveTab(tab.id))}
              style={[
                styles.sectionTabBtn,
                isSelected && {
                  borderBottomColor: tab.id === 'favorites' ? '#EAB308' : colors.primaryLight,
                  borderBottomWidth: 2,
                },
              ]}
            >
              <Ionicons
                name={
                  tab.id === 'favorites' && isSelected
                    ? 'star'
                    : tab.id === 'archived' && isSelected
                    ? 'archive'
                    : tab.icon
                }
                size={14}
                color={
                  isSelected
                    ? tab.id === 'favorites'
                      ? '#EAB308'
                      : colors.primaryLight
                    : colors.textSecondary
                }
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  styles.sectionTabText,
                  {
                    color: isSelected
                      ? tab.id === 'favorites'
                        ? '#EAB308'
                        : colors.primaryLight
                      : colors.textSecondary,
                  },
                  isSelected && { fontWeight: typography.weights.bold },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 2. Search and Category Filter Bar */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={(text) => dispatch(setSearchQuery(text))}
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => dispatch(setSelectedCategory(cat))}
      />

      {/* 3. Search Mode (Semantic / Keyword) & Date Filter Pills */}
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

      {/* 4. Sub-bar with count and Pinned Only filter */}
      <View style={styles.filterMetaRow}>
        <View style={styles.countBadgeRow}>
          <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
            {memories.length} of {total || memories.length} {total === 1 ? 'memory' : 'memories'}
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

      {/* 5. Memory List with Pagination & Refresh */}
      {loading && memories.length === 0 ? (
        <LoadingSpinner message="Loading memories..." fullScreen />
      ) : (
        <FlatList
          data={memories}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 95 },
          ]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadMemories}
              tintColor={colors.primaryLight}
              colors={[colors.primaryLight]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={emptyDetails.icon}
              title={emptyDetails.title}
              description={emptyDetails.description}
              actionTitle="Record Voice Memo"
              onAction={() => navigation.navigate(ROUTES.RECORD)}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primaryLight} />
                <Text style={[styles.footerLoaderText, { color: colors.textSecondary }]}>
                  Loading more memories...
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <MemoryCard
              memory={item}
              onPress={() => navigation.navigate(ROUTES.MEMORY_DETAIL, { memoryId: item._id })}
              onTogglePin={(id) => dispatch(togglePin(id))}
              onToggleFavorite={(id) => dispatch(toggleFavorite(id))}
              onToggleArchive={(id) => dispatch(toggleArchive(id))}
              onDelete={(id) => handleDelete(id, item.title)}
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
  sectionTabsWrap: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.sm,
  },
  sectionTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sectionTabText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
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
    gap: 6,
    paddingVertical: 2,
  },
  datePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  datePillText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.medium,
  },
  filterMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
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
    backgroundColor: 'rgba(139, 92, 246, 0.16)',
    paddingHorizontal: 7,
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
    padding: spacing.lg,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: typography.sizes.xs,
  },
});

export default MemoryListScreen;
