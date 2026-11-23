import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius } from '../../theme/spacing';
import typography from '../../theme/typography';
import { createMemory } from '../../store/slices/memorySlice';
import { getCategoryIcon } from '../../utils/helpers';

const CATEGORIES = ['Ideas', 'Work', 'Study', 'Personal', 'Tasks'];

export const QuickNoteModal = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const { actionLoading } = useSelector((state) => state.memory);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Ideas');
  const [tags, setTags] = useState('');
  const [importance, setImportance] = useState(3);
  const [error, setError] = useState('');

  const resetForm = () => {
    setTitle('');
    setContent('');
    setCategory('Ideas');
    setTags('');
    setImportance(3);
    setError('');
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please provide a title for your note.');
      return;
    }
    if (!content.trim()) {
      setError('Please write your note content.');
      return;
    }

    const tagArray = tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const memoryPayload = {
      title: title.trim(),
      transcript: content.trim(),
      summary: content.trim().length > 140 ? content.trim().substring(0, 140) + '...' : content.trim(),
      category,
      tags: tagArray.length > 0 ? tagArray : [category.toLowerCase()],
      importance,
      sentiment: 'neutral',
      reminders:
        category === 'Tasks'
          ? [{ title: title.trim(), isCompleted: false, remindAt: null }]
          : [],
      actionItems: category === 'Tasks' ? [title.trim()] : [],
    };

    const result = await dispatch(createMemory(memoryPayload));
    if (result.meta.requestStatus === 'fulfilled') {
      resetForm();
      onClose();
    } else {
      setError(result.payload || 'Failed to save note to memory.');
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Quick Text Note"
      subtitle="Save a thought or task directly to memory without voice recording"
    >
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {error ? (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: colors.recordRed + '18', borderColor: colors.recordRed + '40' },
            ]}
          >
            <Ionicons name="alert-circle" size={18} color={colors.recordRed} />
            <Text style={[styles.errorText, { color: colors.recordRed }]}>{error}</Text>
          </View>
        ) : null}

        <Input
          label="Title"
          placeholder="e.g. Design review takeaways"
          value={title}
          onChangeText={(txt) => {
            setTitle(txt);
            if (error) setError('');
          }}
          icon="bookmark-outline"
        />

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Category</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat;
            const catColor = colors.categories[cat] || colors.primary;
            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.7}
                onPress={() => setCategory(cat)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected ? catColor + '25' : colors.surface,
                    borderColor: isSelected ? catColor : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={getCategoryIcon(cat)}
                  size={14}
                  color={isSelected ? catColor : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: isSelected ? catColor : colors.textSecondary,
                      fontWeight: isSelected ? typography.weights.bold : typography.weights.medium,
                    },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Input
          label="Note Content"
          placeholder="What's on your mind? Capture points, decisions, or steps..."
          value={content}
          onChangeText={(txt) => {
            setContent(txt);
            if (error) setError('');
          }}
          multiline
          numberOfLines={4}
          icon="create-outline"
        />

        <Input
          label="Tags (Optional)"
          placeholder="Comma separated: ux, wireframes, sprint"
          value={tags}
          onChangeText={setTags}
          icon="pricetag-outline"
        />

        <View style={styles.importanceRow}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
            Priority / Importance
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setImportance(star)}>
                <Ionicons
                  name={star <= importance ? 'star' : 'star-outline'}
                  size={22}
                  color={star <= importance ? colors.amber : colors.border}
                  style={{ marginHorizontal: 2 }}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.actionRow}>
          <Button
            title="Save to Memory"
            variant="primary"
            size="lg"
            icon="save-outline"
            onPress={handleSave}
            loading={actionLoading}
            disabled={actionLoading}
            style={{ width: '100%', marginTop: spacing.md }}
          />
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: 6,
  },
  errorText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    flex: 1,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    marginBottom: 6,
    marginTop: spacing.xs,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  categoryText: {
    fontSize: typography.sizes.xs,
  },
  importanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
  },
  actionRow: {
    marginBottom: spacing.sm,
  },
});

export default QuickNoteModal;
