import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import Input from '../common/Input';
import CategoryPill from './CategoryPill';
import { spacing } from '../../theme/spacing';

const CATEGORIES = ['All', 'Ideas', 'Work', 'Study', 'Personal', 'Tasks', 'Whereabouts', 'People', 'Health'];

export const SearchFilterBar = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Minimalist Search Bar */}
      <Input
        value={searchQuery}
        onChangeText={onSearchChange}
        placeholder="Search notes, objects, places..."
        icon="search-outline"
        rightIcon={searchQuery ? 'close-circle-outline' : null}
        onRightIconPress={() => onSearchChange('')}
        style={styles.searchInput}
      />

      {/* Category Pills Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {CATEGORIES.map((cat) => (
          <CategoryPill
            key={cat}
            category={cat}
            isSelected={selectedCategory === cat}
            onPress={() => onSelectCategory(cat)}
            size="sm"
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  searchInput: {
    marginBottom: spacing.xs,
  },
  categoriesContainer: {
    paddingVertical: spacing.xxs,
  },
});

export default SearchFilterBar;
