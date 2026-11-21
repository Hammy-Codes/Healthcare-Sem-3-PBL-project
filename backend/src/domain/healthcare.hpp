#ifndef CAREBRIDGE_HEALTHCARE_HPP
#define CAREBRIDGE_HEALTHCARE_HPP
#include <cstdio>
#include <fstream>
#include <stdexcept>
#include <string>
#include <sstream>
#include "../dsa/linked_list.h"
#include "../dsa/queue.h"
namespace carebridge {
enum class Role { Patient, Doctor, LabTechnician };
class User {
protected:
    std::string id_, name_, email_;
    Role role_;
public:
    User(const std::string& id,const std::string& name,const std::string& email,Role role):id_(id),name_(name),email_(email),role_(role) {
        if(id.empty()||name.empty()||email.empty()) throw std::invalid_argument("user fields required");
    }
    virtual ~User() {}
    virtual std::string kind() const=0;
    const std::string& id() const{return id_;}
    const std::string& name() const{return name_;}
    const std::string& email() const{return email_;}
    Role role() const{return role_;}
};
class Patient:public User { public: Patient(const std::string&i,const std::string&n,const std::string&e):User(i,n,e,Role::Patient){} std::string kind()const override{return "patient";} };
class Doctor:public User {
    std::string specialty_;
public:
    Doctor(const std::string&i,const std::string&n,const std::string&e,const std::string&s):User(i,n,e,Role::Doctor),specialty_(s){if(s.empty())throw std::invalid_argument("specialty required");}
    std::string kind()const override{return "doctor";}
    const std::string& specialty()const{return specialty_;}
};
class LabTechnician:public User {
    std::string department_;
public:
    LabTechnician(const std::string&i,const std::string&n,const std::string&e,const std::string&d):User(i,n,e,Role::LabTechnician),department_(d){if(d.empty())throw std::invalid_argument("department required");}
    std::string kind()const override{return "lab_technician";}
    const std::string& department()const{return department_;}
};
class Appointment {
    std::string id_,patient_,doctor_,status_;
public:
    Appointment(const std::string&i,const std::string&p,const std::string&d,const std::string&status="booked"):id_(i),patient_(p),doctor_(d),status_(status){if(i.empty()||p.empty()||d.empty())throw std::invalid_argument("appointment fields required");}
    const std::string&id()const{return id_;} const std::string&patientId()const{return patient_;} const std::string&doctorId()const{return doctor_;} const std::string&status()const{return status_;}
    void transition(const std::string&s){
        if(s!="approved"&&s!="rejected"&&s!="completed"&&s!="cancelled") throw std::invalid_argument("invalid appointment status");
        if(!(status_=="booked"&&(s=="approved"||s=="rejected"||s=="cancelled"))&&!(status_=="approved"&&(s=="completed"||s=="cancelled"))) throw std::invalid_argument("invalid appointment transition");
        status_=s;
    }
};
struct Consent {std::string patient,doctor,scope,status;bool permits(const std::string&p,const std::string&d,const std::string&s)const{return patient==p&&doctor==d&&scope==s&&status=="active";}};
struct ClinicalRecord {std::string id,patient,doctor,type,title,content,createdAt;};
struct Prescription {std::string id,patient,doctor,filename,contentType,base64,createdAt;};
struct SymptomRecord {std::string id,patient,summary,severity,createdAt;};
struct VitalReading {std::string id,patient,type,unit,recordedAt;double value;bool simulated;};
struct PatientAlert {std::string id,patient,severity,reason,status,createdAt;};
struct LaboratoryTest {std::string name,unit,referenceRange;};
struct LaboratoryResult {std::string patient,order,technician,test,value,unit,referenceRange,timestamp,status;};
class LaboratoryOrder {
    std::string id_,patient_,doctor_,department_,technician_,test_,status_;
    void authorize(const std::string&t)const{if(technician_.empty()||technician_!=t)throw std::runtime_error("laboratory assignment denied");}
public:
    LaboratoryOrder(const std::string&i,const std::string&p,const std::string&d,const std::string&dept,const std::string&t,const std::string&status="Requested",const std::string&technician=""):id_(i),patient_(p),doctor_(d),department_(dept),technician_(technician),test_(t),status_(status){if(i.empty()||p.empty()||d.empty()||dept.empty()||t.empty())throw std::invalid_argument("laboratory order fields required");}
    void assign(const std::string&t){if(status_!="Requested"||t.empty())throw std::invalid_argument("invalid assignment");technician_=t;status_="Assigned";}
    void begin(const std::string&t){authorize(t);if(status_!="Assigned")throw std::invalid_argument("invalid transition");status_="In Progress";}
    void complete(const std::string&t){authorize(t);if(status_!="In Progress")throw std::invalid_argument("invalid transition");status_="Completed";}
    void reject(const std::string&t){authorize(t);if(status_!="Assigned")throw std::invalid_argument("only assigned investigations can be rejected");status_="Rejected";}
    void cancel(){if(status_!="Requested"&&status_!="Assigned")throw std::invalid_argument("investigation can no longer be cancelled");status_="Cancelled";}
    const std::string&id()const{return id_;}const std::string&patientId()const{return patient_;}const std::string&technicianId()const{return technician_;}const std::string&department()const{return department_;}const std::string&test()const{return test_;}const std::string&status()const{return status_;}
};
class FileStore {
    std::string root_;
public:
    explicit FileStore(const std::string&r):root_(r){}
    void replace(const std::string&name,const std::string&contents)const{
        if(name.empty()||name.find("..")!=std::string::npos||name.find('/')!=std::string::npos||name.find('\\')!=std::string::npos) throw std::invalid_argument("invalid data file");
        const std::string target=root_+"/"+name,tmp=target+".tmp";
        {std::ofstream f(tmp.c_str(),std::ios::binary|std::ios::trunc);if(!f)throw std::runtime_error("cannot open temporary data file");f.write(contents.data(),(std::streamsize)contents.size());f.flush();if(!f)throw std::runtime_error("cannot write data file");}
        if(std::rename(tmp.c_str(),target.c_str())!=0){std::remove(tmp.c_str());throw std::runtime_error("atomic data replacement failed");}
    }
    std::string read(const std::string&name)const{std::ifstream f((root_+"/"+name).c_str(),std::ios::binary);if(!f)return std::string();std::ostringstream s;s<<f.rdbuf();return s.str();}
};
class HealthcareSystem {
    CBQueue laboratoryQueue_;
    CBListNode* recordIds_;
public:
    HealthcareSystem():recordIds_(0){cb_queue_init(&laboratoryQueue_);}
    ~HealthcareSystem(){cb_queue_clear(&laboratoryQueue_);cb_list_free(&recordIds_);}
    bool enqueueLab(int id){return cb_queue_enqueue(&laboratoryQueue_,id)!=0;}
    bool nextLab(int&id){return cb_queue_dequeue(&laboratoryQueue_,&id)!=0;}
    bool indexRecord(int id){return cb_list_insert(&recordIds_,id)!=0;}
    bool hasRecord(int id)const{return cb_list_search(recordIds_,id)!=0;}
};
}
#endif
