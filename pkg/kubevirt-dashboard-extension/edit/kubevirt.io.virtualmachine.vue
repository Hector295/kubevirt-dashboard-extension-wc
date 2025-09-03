<script>
import { _CREATE, _VIEW } from '@shell/config/query-params';
import CruResource from '@shell/components/CruResource';
import CreateEditView from '@shell/mixins/create-edit-view';
import FormValidation from '@shell/mixins/form-validation';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import Tab from '@shell/components/Tabbed/Tab';
import Tabbed from '@shell/components/Tabbed';
import { set, get } from '@shell/utils/object';
import { LabeledInput, Checkbox } from '@rancher/components';
import { EDITOR_MODES } from '@shell/components/YamlEditor';
import Loading from '@shell/components/Loading';
import VMBasicConfig from '../components/form/VMBasicConfig';
import VMResourcesConfig from '../components/form/VMResourcesConfig';
import VMNetworkConfig from '../components/form/VMNetworkConfig';
import VMDiskConfig from '../components/form/VMDiskConfig';

export default {
  name: 'CruVirtualMachine',
  components: {
    CruResource,
    NameNsDescription,
    Tabbed,
    Tab,
    LabeledInput,
    Checkbox,
    Loading,
    VMBasicConfig,
    VMResourcesConfig,
    VMNetworkConfig,
    VMDiskConfig,
  },
  mixins: [CreateEditView, FormValidation],

  props: {
    mode: {
      type: String,
      default: _CREATE,
    },
    resource: {
      type: String,
      default: null,
    },
    value: {
      type: Object,
      required: true,
    },
  },

  emits: ['input'],

  data() {
    return {
      fvFormRuleSets: [
        { path: 'metadata.name', rules: ['required'] },
        { path: 'spec.template.spec.domain.cpu.cores', rules: ['required'] },
      ],
    };
  },

  computed: {
    tabErrors() {
      return {
        basic: this.fvGetPathErrors(['metadata.name'])?.length > 0,
        resources: 
          this.fvGetPathErrors(['spec.template.spec.domain.cpu.cores'])?.length > 0 ||
          this.fvGetPathErrors(['spec.template.spec.domain.memory.guest'])?.length > 0,
      };
    },

    editorMode() {
      return this.isView ? EDITOR_MODES.VIEW_CODE : EDITOR_MODES.EDIT_CODE;
    },

    isView() {
      return this.mode === _VIEW;
    },

    vmRunning: {
      get() {
        const runStrategy = get(this.value, 'spec.runStrategy');
        return runStrategy === 'Always' || runStrategy === 'RerunOnFailure';
      },
      set(newValue) {
        if (newValue) {
          set(this.value, 'spec.runStrategy', 'Always');
        } else {
          set(this.value, 'spec.runStrategy', 'Halted');
        }
        // Remove deprecated spec.running if it exists
        const spec = get(this.value, 'spec') || {};
        if ('running' in spec) {
          delete spec.running;
        }
      },
    },

    terminationGracePeriod: {
      get() {
        return get(this.value, 'spec.template.spec.terminationGracePeriodSeconds') || 30;
      },
      set(newValue) {
        set(this.value, 'spec.template.spec.terminationGracePeriodSeconds', parseInt(newValue));
      },
    },

    cpuCores: {
      get() {
        return get(this.value, 'spec.template.spec.domain.cpu.cores') || 1;
      },
      set(newValue) {
        const cpuValue = parseFloat(newValue);
        set(this.value, 'spec.template.spec.domain.cpu.cores', isNaN(cpuValue) ? 1 : cpuValue);
      },
    },

    memory: {
      get() {
        return get(this.value, 'spec.template.spec.domain.memory.guest') || '1Gi';
      },
      set(newValue) {
        set(this.value, 'spec.template.spec.domain.memory.guest', newValue);
      },
    },

    disks: {
      get() {
        return get(this.value, 'spec.template.spec.domain.devices.disks') || [];
      },
      set(newValue) {
        set(this.value, 'spec.template.spec.domain.devices.disks', newValue);
      },
    },

    volumes: {
      get() {
        return get(this.value, 'spec.template.spec.volumes') || [];
      },
      set(newValue) {
        set(this.value, 'spec.template.spec.volumes', newValue);
      },
    },

    networks: {
      get() {
        return get(this.value, 'spec.template.spec.networks') || [];
      },
      set(newValue) {
        set(this.value, 'spec.template.spec.networks', newValue);
      },
    },

    interfaces: {
      get() {
        return get(this.value, 'spec.template.spec.domain.devices.interfaces') || [];
      },
      set(newValue) {
        set(this.value, 'spec.template.spec.domain.devices.interfaces', newValue);
      },
    },
  },

  created() {
    this.initializeDefaults();
  },

  methods: {
    initializeDefaults() {
      if (!this.value.spec) {
        set(this.value, 'spec', {});
      }
      if (this.mode === _CREATE) {
        if (this.value.spec.running === undefined) {
          set(this.value, 'spec.running', false);
        }
        if (!this.value.spec.template) {
          set(this.value, 'spec.template', {
            metadata: {
              labels: {},
            },
            spec: {
              terminationGracePeriodSeconds: 30,
              architecture: 'amd64',
              domain: {
                cpu: { cores: 1 },
                memory: { guest: '1Gi' },
                devices: {
                  disks: [],
                  interfaces: [],
                },
                machine: {
                  type: 'q35',
                },
              },
              volumes: [],
              networks: [],
            },
          });
        }

        if (!this.value.spec.runStrategy && this.value.spec.running === undefined) {
          set(this.value, 'spec.runStrategy', 'Manual');
        }

        const vmName = this.value.metadata?.name;
        if (vmName) {
          if (!this.value.spec.template.metadata.labels) {
            set(this.value, 'spec.template.metadata.labels', {});
          }
          this.value.spec.template.metadata.labels['kubevirt.io/domain'] = vmName;
        }
      } else {
        if (!this.value.spec.template) {
          set(this.value, 'spec.template', { metadata: { labels: {} }, spec: {} });
        }
        if (!this.value.spec.template.metadata) {
          set(this.value, 'spec.template.metadata', { labels: {} });
        }
        if (!this.value.spec.template.metadata.labels) {
          set(this.value, 'spec.template.metadata.labels', {});
        }
        if (!this.value.spec.template.spec) {
          set(this.value, 'spec.template.spec', {});
        }
        if (!this.value.spec.template.spec.domain) {
          set(this.value, 'spec.template.spec.domain', { devices: {}, cpu: {}, memory: {} });
        }
        if (!this.value.spec.template.spec.domain.devices) {
          set(this.value, 'spec.template.spec.domain.devices', { disks: [], interfaces: [] });
        }
        if (!this.value.spec.template.spec.domain.cpu) {
          set(this.value, 'spec.template.spec.domain.cpu', {});
        }
        if (!this.value.spec.template.spec.domain.memory) {
          set(this.value, 'spec.template.spec.domain.memory', {});
        }
        if (!this.value.spec.template.spec.volumes) {
          set(this.value, 'spec.template.spec.volumes', []);
        }
        if (!this.value.spec.template.spec.networks) {
          set(this.value, 'spec.template.spec.networks', []);
        }
      }
    },

    fvExtraRules() {
      return [
        {
          path: 'spec.template.spec.domain.cpu.cores',
          rules: [
            (v) => {
              if (!v || v === '' || v === null || v === undefined) {
                return 'CPU cores is required';
              }
              const num = parseFloat(v);
              if (isNaN(num)) return 'CPU cores must be a valid number';
              if (num < 0.1) return 'CPU cores must be at least 0.1';
              if (num > 32) return 'CPU cores cannot exceed 32';
              return true;
            },
          ],
        },
        {
          path: 'spec.template.spec.domain.memory.guest',
          rules: [
            (v) => {
              if (!v || v === '') {
                return 'Memory is required';
              }
              // Validate memory format (number + unit)
              const memoryRegex = /^(\d+)(Mi|Gi|Ti)$/;
              if (!memoryRegex.test(v)) {
                return 'Memory must be in format like "1Gi", "512Mi", etc.';
              }
              
              const match = v.match(memoryRegex);
              const num = parseInt(match[1]);
              const unit = match[2];
              
              if (unit === 'Mi' && (num < 128 || num > 32768)) {
                return 'Memory must be between 128Mi and 32768Mi';
              }
              if (unit === 'Gi' && (num < 1 || num > 32)) {
                return 'Memory must be between 1Gi and 32Gi';
              }
              if (unit === 'Ti' && num > 1) {
                return 'Memory cannot exceed 1Ti';
              }
              return true;
            },
          ],
        },
      ];
    },

    onTabChanged({ tab }) {
      this.$refs[`${tab.name}EditorRef`]?.refresh();
    },
  },

  watch: {
    'value.metadata.name'(newName) {
      if (newName && this.mode === _CREATE) {
        if (!this.value.spec.template.metadata.labels) {
          set(this.value, 'spec.template.metadata.labels', {});
        }
        this.value.spec.template.metadata.labels['kubevirt.io/domain'] = newName;
      }
    },
  },
};
</script>

<template>
  <Loading v-if="!value" />
  <CruResource
    v-else
    :done-route="doneRoute"
    :can-yaml="true"
    :mode="mode"
    :resource="value"
    :errors="fvUnreportedValidationErrors"
    :validation-passed="fvFormIsValid"
    @error="(e) => (errors = e)"
    @finish="save"
    @cancel="done"
  >
    <NameNsDescription
      :value="value"
      :mode="mode"
      :description-hidden="false"
      @input="$emit('input', $event)"
    />

    <div class="row mb-20">
      <div class="col span-6">
        <Checkbox
          v-model:value="vmRunning"
          :mode="mode"
          :label="t('kubevirt.edit.vm.fields.running.label')"
          :tooltip="t('kubevirt.edit.vm.fields.running.tooltip')"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          v-model:value="terminationGracePeriod"
          type="number"
          :mode="mode"
          :label="t('kubevirt.edit.vm.fields.terminationGracePeriod.label')"
          :tooltip="t('kubevirt.edit.vm.fields.terminationGracePeriod.tooltip')"
          min="0"
        />
      </div>
    </div>

    <Tabbed :side-tabs="true" @changed="onTabChanged">
      <Tab
        name="basic"
        :label="t('kubevirt.edit.vm.tabs.basic.title')"
        :weight="5"
        :error="tabErrors.basic"
      >
        <VMBasicConfig :value="value" :mode="mode" />
      </Tab>

      <Tab
        name="resources"
        :label="t('kubevirt.edit.vm.tabs.resources.title')"
        :weight="4"
        :error="tabErrors.resources"
      >
        <VMResourcesConfig :value="value" :mode="mode" :rules="fvGetAndReportPathRules" />
      </Tab>

      <Tab name="disks" :label="t('kubevirt.edit.vm.tabs.disks.title')" :weight="3">
        <VMDiskConfig :value="value" :mode="mode" />
      </Tab>

      <Tab name="network" :label="t('kubevirt.edit.vm.tabs.network.title')" :weight="2">
        <VMNetworkConfig :value="value" :mode="mode" />
      </Tab>
    </Tabbed>
  </CruResource>
</template>
