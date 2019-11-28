import classnames from 'classnames';
import _ from 'lodash';
import { inject, observer } from 'mobx-react';
import React from 'react';
import { Button } from '~/components/controls';
import InputContainer from '~/components/controls/InputContainer';
import Loader, { LoaderSize } from '~/components/shared/loader/Loader';
import ButtonType from '~/enums/buttonType';
import LineHeaderFactory from '~/factories/lineHeaderFactory';
import ILineHeader from '~/models/ILineHeader';
import LineHeaderService from '~/services/lineHeaderService';
import { AlertStore } from '~/stores/alertStore';
import { ConfirmStore } from '~/stores/confirmStore';
import { ErrorStore } from '~/stores/errorStore';
import { IMassEditLineHeader, LineHeaderMassEditStore } from '~/stores/lineHeaderMassEditStore';
import { getDateWithoutHours } from '~/util/dateHelpers';
import FormValidator from '~/validation/FormValidator';
import SidebarHeader from '../SidebarHeader';
import LineHeaderForm from './LineHeaderForm';
import LineHeaderTableRows from './LineHeaderTableRows';
import * as s from './lineHeaderTable.scss';

interface ILineHeaderState {
    isLoading: boolean;
    lineHeaders: ILineHeader[] | null;
}

interface ILineHeaderListProps {
    lineId: string;
    lineHeaderMassEditStore?: LineHeaderMassEditStore;
    confirmStore?: ConfirmStore;
    alertStore?: AlertStore;
    errorStore?: ErrorStore;
}

@inject('lineHeaderMassEditStore', 'confirmStore', 'alertStore', 'errorStore')
@observer
class LineHeaderTable extends React.Component<ILineHeaderListProps, ILineHeaderState> {
    private mounted: boolean;
    constructor(props: ILineHeaderListProps) {
        super(props);
        this.state = {
            isLoading: true,
            lineHeaders: null
        };
    }
    async componentWillMount() {
        const lineHeaders: ILineHeader[] = await LineHeaderService.fetchLineHeaders(
            this.props.lineId
        );
        if (this.mounted) {
            this.setState({
                lineHeaders,
                isLoading: false
            });
        }
    }

    componentDidMount() {
        this.mounted = true;
    }

    componentDidUpdate() {
        const lineHeaders = this.state.lineHeaders;
        if (lineHeaders && !this.props.lineHeaderMassEditStore!.massEditLineHeaders) {
            this.props.lineHeaderMassEditStore!.init(lineHeaders);
        }
    }

    componentWillUnmount() {
        this.mounted = false;
        this.props.lineHeaderMassEditStore!.clear();
    }

    private createNewLineHeader = () => {
        const lastLineHeader = _.last(this.props.lineHeaderMassEditStore!.massEditLineHeaders)!
            .lineHeader;
        const defaultDate = new Date(lastLineHeader.endDate);
        defaultDate.setDate(defaultDate.getDate() + 1);
        const newLineHeader = LineHeaderFactory.createNewLineHeader({
            lineId: this.props.lineId,
            startDate: defaultDate,
            endDate: defaultDate
        });
        this.props.lineHeaderMassEditStore!.createLineHeader(newLineHeader);
    };

    private onChangeLineHeaderProperty = (property: keyof ILineHeader, value: any) => {
        this.props.lineHeaderMassEditStore!.updateLineHeaderProperty(property, value);
    };

    private getActiveLineHeaderName = (): string | null => {
        const currentTime = getDateWithoutHours(new Date()).getTime();
        let activeMassEditLineHeader: IMassEditLineHeader | null = null;
        this.props.lineHeaderMassEditStore!.massEditLineHeaders!.forEach(
            (m: IMassEditLineHeader) => {
                if (m.isRemoved) return;

                const lineHeader = m.lineHeader;
                if (
                    currentTime >= lineHeader.startDate!.getTime() &&
                    currentTime <= lineHeader.endDate!.getTime()
                ) {
                    activeMassEditLineHeader = m;
                }
            }
        );
        return activeMassEditLineHeader ? activeMassEditLineHeader!.lineHeader.lineNameFi : null;
    };

    private save = async () => {
        const lineHeaderMassEditStore = this.props.lineHeaderMassEditStore;
        this.setState({ isLoading: true });

        try {
            await LineHeaderService.massEditLineHeaders(
                lineHeaderMassEditStore!.massEditLineHeaders!,
                lineHeaderMassEditStore!.oldLineHeaders!,
                this.props.lineId
            );

            this.props.alertStore!.setFadeMessage('Tallennettu!');
        } catch (e) {
            this.props.errorStore!.addError(`Tallennus epäonnistui`, e);
            return;
        }

        lineHeaderMassEditStore!.init(lineHeaderMassEditStore!.currentLineHeaders);

        this.setState({
            isLoading: false
        });
    };

    private isFormValid = () => {
        let isFormValid = true;
        this.props.lineHeaderMassEditStore!.massEditLineHeaders!.forEach(
            (m: IMassEditLineHeader) => {
                if (m.isRemoved) return;

                if (!FormValidator.isInvalidPropertiesMapValid(m.invalidPropertiesMap)) {
                    isFormValid = false;
                }
            }
        );
        return isFormValid;
    };

    render() {
        if (this.state.isLoading) {
            return (
                <div className={classnames(s.lineHeaderTableView, s.loaderContainer)}>
                    <Loader size={LoaderSize.TINY} />
                </div>
            );
        }

        const lineHeaderMassEditStore = this.props.lineHeaderMassEditStore;
        const massEditLineHeaders = lineHeaderMassEditStore!.massEditLineHeaders;
        const isEditingDisabled = lineHeaderMassEditStore!.isEditingDisabled;
        if (!massEditLineHeaders) return null;

        const currentLineHeaders = lineHeaderMassEditStore!.currentLineHeaders;
        const selectedMassEditLineHeader =
            lineHeaderMassEditStore!.selectedLineHeaderId !== null
                ? lineHeaderMassEditStore!.massEditLineHeaders!.find(
                      m => m.id === lineHeaderMassEditStore!.selectedLineHeaderId
                  )
                : null;
        const activeLineHeaderName = this.getActiveLineHeaderName();

        const isSaveButtonDisabled =
            isEditingDisabled ||
            !lineHeaderMassEditStore!.isDirty ||
            !this.isFormValid() ||
            !activeLineHeaderName;
        return (
            <div className={s.lineHeaderTableView}>
                <SidebarHeader
                    isEditing={!isEditingDisabled}
                    onEditButtonClick={lineHeaderMassEditStore!.toggleIsEditingDisabled}
                    hideCloseButton={true}
                    hideBackButton={true}
                    isEditButtonVisible={currentLineHeaders.length > 0}
                    shouldShowClosePromptMessage={lineHeaderMassEditStore!.isDirty}
                >
                    Linjan otsikot
                </SidebarHeader>
                <div className={s.flexRow}>
                    <InputContainer
                        disabled={true}
                        label={'LINJAN VOIMASSAOLEVA OTSIKKO'}
                        value={
                            activeLineHeaderName
                                ? activeLineHeaderName
                                : 'Ei voimassa olevaa otsikkoa.'
                        }
                        validationResult={{
                            isValid: Boolean(activeLineHeaderName)
                        }}
                        isInputColorRed={!Boolean(activeLineHeaderName)}
                    />
                </div>
                {currentLineHeaders.length > 0 ? (
                    <table className={s.lineHeaderTable}>
                        <tbody>
                            <tr>
                                <th className={classnames(s.inputLabel, s.columnHeader)}>
                                    LINJAN NIMI
                                </th>
                                <th className={classnames(s.inputLabel, s.columnHeader)}>
                                    VOIM. AST
                                </th>
                                <th className={classnames(s.inputLabel, s.columnHeader)}>
                                    VIIM. VOIM.
                                </th>
                                <th />
                                <th />
                                <th />
                            </tr>
                            <LineHeaderTableRows />
                        </tbody>
                    </table>
                ) : (
                    <div>Linjalle {this.props.lineId} ei löytynyt otsikoita.</div>
                )}
                <Button
                    className={s.createNewLineHeaderButton}
                    type={ButtonType.SQUARE}
                    disabled={false}
                    hasPadding={true}
                    onClick={() => this.createNewLineHeader()}
                >
                    Luo uusi linjan otsikko
                </Button>
                {selectedMassEditLineHeader && (
                    <LineHeaderForm
                        lineHeader={selectedMassEditLineHeader!.lineHeader}
                        isEditingDisabled={isEditingDisabled}
                        invalidPropertiesMap={selectedMassEditLineHeader!.invalidPropertiesMap}
                        onChangeLineHeaderProperty={this.onChangeLineHeaderProperty}
                    />
                )}
                <Button
                    className={s.saveLineHeadersButton}
                    onClick={this.save}
                    type={ButtonType.SAVE}
                    disabled={isSaveButtonDisabled}
                >
                    Tallenna linjan otsikot
                </Button>
            </div>
        );
    }
}

export default LineHeaderTable;
