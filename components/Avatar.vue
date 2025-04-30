<template>
  <div class="avatar" :class="[size]" :style="avatarStyle">
    {{ initials }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAvatar } from '~/composables/useAvatar';

const props = defineProps({
  name: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: 'medium', // small, medium, large
    validator: (value: string) => ['small', 'medium', 'large'].includes(value)
  }
});

const { getInitials, getAvatarStyle } = useAvatar();

const initials = computed(() => getInitials(props.name || props.email));
const avatarStyle = computed(() => getAvatarStyle(props.email));
</script>

<style scoped>
.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: white;
  font-weight: bold;
  border: 2px solid white;
  text-transform: uppercase;
}

.small {
  width: 32px;
  height: 32px;
  font-size: 14px;
}

.medium {
  width: 48px;
  height: 48px;
  font-size: 18px;
}

.large {
  width: 120px;
  height: 120px;
  font-size: 48px;
}
</style> 